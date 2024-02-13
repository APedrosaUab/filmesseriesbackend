require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGODB_URI);
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const Utilizador = require("./models/Utilizador");

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// Função para enviar e-mails
async function sendEmail({ to, subject, text }) {
  const mailOptions = {
    from: '"2302570" <pwauab@gmail.com>', 
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw error;
  }
}

function generateSessionToken(user) {
  return jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const utilizador = await Utilizador.findOne({ username });
    if (!utilizador) {
      return res.status(404).json({ message: "Utilizador não encontrado." });
    }
    const isMatch = await bcrypt.compare(password, utilizador.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Password incorrecta." });
    }

    // Gerar token de sessão
    const sessionToken = generateSessionToken(utilizador);

    // Guardar o token de sessão no documento do utilizador
    utilizador.tokenSessao = sessionToken;
    await utilizador.save();

    res.json({
      message: "Login bem-sucedido.",
      sessionToken,
      username: utilizador.username,
      id_utilizador: utilizador._id,
      avatarUser: utilizador.avatarUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao realizar login." });
  }
});

// NOVO UTILIZADOR
app.post("/utilizadores", async (req, res) => {
  try {
    const {
      nome,
      apelido,
      username,
      dataNascimento,
      email,
      avatarUser,
      password,
    } = req.body;
    if (
      !nome ||
      !apelido ||
      !username ||
      !dataNascimento ||
      !email ||
      !avatarUser ||
      !password
    ) {
      return res.status(400).json({ message: "Dados incompletos." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const utilizador = new Utilizador({
      nome,
      apelido,
      username,
      dataNascimento,
      email,
      avatarUser,
      password_hash: hashedPassword,
    });
    await utilizador.save();
    res.status(201).json({ message: "Utilizador criado com sucesso." });
  } catch (error) {
    console.error("Erro ao criar utilizador:", error);
    res.status(500).json({
      message: "Erro ao criar novo utilizador. Escolha outro username.",
      error: error.message,
    });
  }
});

// RECUPERAR PASSWORD
app.post('/forgot/recuperar-password', async (req, res) => {
  const { email } = req.body;
  const utilizador = await Utilizador.findOne({ email });
  if (!utilizador) {
    return res.status(404).send('Utilizador não encontrado com o e-mail indicado.');
  }

  const resetToken = generateSessionToken(utilizador);
  utilizador.resetPasswordToken = resetToken;
  utilizador.resetPasswordExpires = Date.now() + 3600000; // 1 hora para expirar

  await utilizador.save();

  const resetUrl = `${FRONTEND_URL}/recover/redefinir-password/${resetToken}`;

  const message = `Foi solicitada a redefinição de password da sua conta. Por favor, clique no link abaixo para redefinir a sua password:\n\n${resetUrl}\n\nSe não fez qualquer solicitação, por favor, ignore este e-mail.`;

  try {
    await sendEmail({
      to: email,
      subject: 'Instruções de Redefinição de Password',
      text: message,
    });
    res.status(200).send('E-mail enviado com instruções de redefinição de password.');
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição de password:', error);
    res.status(500).send('Erro ao enviar e-mail de redefinição de password.');
  }
});

// REDEFINIR PASSWORD
app.post('/recover/redefinir-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  const utilizador = await Utilizador.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!utilizador) {
    return res.status(400).send('Token de redefinição de Password é inválido ou expirou.');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  utilizador.password_hash = hashedNewPassword;
  utilizador.resetPasswordToken = undefined;
  utilizador.resetPasswordExpires = undefined;

  await utilizador.save();

  try {
    await sendEmail({
      to: utilizador.email,
      subject: 'Password foi alterada',
      text: 'Password foi alterada com sucesso.',
    });
    res.status(200).send('Password redefinida com sucesso.');
  } catch (error) {
    console.error('Erro ao enviar e-mail de confirmação:', error);
    res.status(500).send('Erro ao enviar e-mail de confirmação de redefinição de Password.');
  }
});


// DADOS UTILIZADOR
app.get("/utilizador/:id", async (req, res) => {
  try {
    const utilizador = await Utilizador.findById(req.params.id);
    if (!utilizador) {
      return res.status(404).json({ message: "Utilizador não encontrado." });
    }
    res.json({
      nome: utilizador.nome,
      apelido: utilizador.apelido,
      username: utilizador.username,
      dataNascimento: utilizador.dataNascimento,
      email: utilizador.email,
      avatarUser: utilizador.avatarUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter dados do Utilizador." });
  }
});

// ATUALIZAR UTILIZADOR
app.put("/utilizador/:id", async (req, res) => {
  try {
    const {
      nome,
      apelido,
      username,
      dataNascimento,
      email,
      avatarUser,
      // password,
    } = req.body;
    const utilizador = await Utilizador.findById(req.params.id);
    if (!utilizador) {
      return res.status(404).json({ message: "Utilizador não encontrado." });
    }

    if (nome) utilizador.nome = nome;
    if (apelido) utilizador.apelido = apelido;
    if (username) utilizador.username = username;
    if (dataNascimento) utilizador.dataNascimento = dataNascimento;
    if (email) utilizador.email = email;
    if (avatarUser) utilizador.avatarUser = avatarUser;
    // if (password) utilizador.password_hash = await bcrypt.hash(password, 10);

    await utilizador.save();
    res.json({ message: "Dados do utilizador atualizados com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar dados do utilizador." });
  }
});

// FILMES
const UtilizadorFilme = require("./models/UtilizadorFilme");
app.get(
  "/utilizador-filme/status/:id_utilizador/:id_filme",
  async (req, res) => {
    try {
      const { id_utilizador, id_filme } = req.params;

      // Verifica se o id_utilizador é um ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(id_utilizador)) {
        return res.status(400).json({ message: "ID do utilizador inválido." });
      }

      const filmeUtilizador = await UtilizadorFilme.findOne({
        id_utilizador,
        id_filme: parseInt(id_filme),
      });

      // Se não encontrou o filme na lista do utilizador, 
      // retorna um status a indicar que não está adicionado
      if (!filmeUtilizador) {
        return res.status(200).json({ added: false, watched: false });
      }

      res.status(200).json({
        added: filmeUtilizador.a_ver,
        watched: filmeUtilizador.visto,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Erro ao verificar o filme na lista." });
    }
  }
);

// ADICIONAR FILMEUTILIZADOR
app.post("/utilizador-filme/adicionar", async (req, res) => {
  try {
    const { id_utilizador, id_filme, visto, a_ver } = req.body;

    let filmeUtilizador = await UtilizadorFilme.findOne({
      id_utilizador,
      id_filme,
    });

    if (filmeUtilizador) {
      filmeUtilizador.visto = visto;
      filmeUtilizador.a_ver = a_ver;

      await filmeUtilizador.save();
    } else {
      filmeUtilizador = new UtilizadorFilme({
        id_utilizador,
        id_filme,
        visto,
        a_ver,
      });
      await filmeUtilizador.save();
    }

    res.status(201).json({
      message: "Filme adicionado à lista do utilizador.",
      filmeUtilizador,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro ao adicionar o filme à lista." });
  }
});

// ATUALIZAR FILMEUTILIZADOR
app.put("/utilizador-filme/update", async (req, res) => {
  const { id_utilizador, id_filme, avaliacao, comentario } = req.body;

  try {
    let filmeUtilizador = await UtilizadorFilme.findOne({
      id_utilizador,
      id_filme,
    });

    if (filmeUtilizador) {
      if (typeof avaliacao !== "undefined") {
        filmeUtilizador.avaliacao = avaliacao;
      }
      if (comentario !== undefined && comentario.trim() !== "") {
        filmeUtilizador.comentario = comentario;
        filmeUtilizador.dataComentario = new Date();
      }

      await filmeUtilizador.save();

      res.json({
        message: "Avaliação atualizada com sucesso.",
        filmeUtilizador,
      });
    } else {
      res.status(404).json({ message: "Filme não encontrado." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar avaliação." });
  }
});

// ADICIONAR FILME
const Filmes = require("./models/Filmes");
app.post("/filmes/adicionar", async (req, res) => {
  let { id_filme, nome, genero, avaliacao_api } = req.body;
  let calc_avaliacao = avaliacao_api - Math.floor(avaliacao_api);

  if(calc_avaliacao == 0) {
    avaliacao_api = avaliacao_api + 0.0001
  }

  try {
    let filmeExistente = await Filmes.findOne({ id_filme });

    if (filmeExistente) {
      // Atualiza o filme existente
      filmeExistente.nome = nome;
      filmeExistente.genero = genero;
      filmeExistente.avaliacao_api = avaliacao_api;
      await filmeExistente.save();
      res.json({
        message: "Filme atualizado com sucesso.",
        filme: filmeExistente,
      });
    } else {
      // Cria um novo filme
      const novoFilme = new Filmes({
        id_filme,
        nome,
        genero,
        avaliacao_api,
      });
      await novoFilme.save();
      res.json({ message: "Filme inserido com sucesso.", filme: novoFilme });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao adicionar o filme." });
  }
});

// SERIES
const UtilizadorSerie = require("./models/UtilizadorSerie");
app.get(
  "/utilizador-serie/status/:id_utilizador/:id_serie",
  async (req, res) => {
    try {
      const { id_utilizador, id_serie } = req.params;

      // Verifica se o id_utilizador é um ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(id_utilizador)) {
        return res.status(400).json({ message: "ID do utilizador inválido." });
      }

      const serieUtilizador = await UtilizadorSerie.findOne({
        id_utilizador,
        id_serie: parseInt(id_serie),
      });
      // Se não encontrou o serie na lista do utilizador,
      // retorna um status a indicar que não está adicionado
      if (!serieUtilizador) {
        return res.status(200).json({ added: false, watched: false });
      }

      res.status(200).json({
        added: serieUtilizador.a_ver,
        watched: serieUtilizador.visto,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Erro ao verificar a série na lista." });
    }
  }
);

// Adicionar ou atualizar série na lista do utilizador
app.post("/utilizador-serie/adicionar", async (req, res) => {
  try {
    const { id_utilizador, id_serie, visto, a_ver } = req.body;

    // Encontrar o registo na base de dados
    let serieUtilizador = await UtilizadorSerie.findOne({
      id_utilizador: new mongoose.Types.ObjectId(id_utilizador),
      id_serie: parseInt(id_serie),
    });

    // Se a série já existe na lista do utilizador, atualiza
    if (serieUtilizador) {
      serieUtilizador.visto = visto;
      serieUtilizador.a_ver = a_ver;
    } else {
      // Se a série não existe na lista, cria uma nova entrada
      serieUtilizador = new UtilizadorSerie({
        id_utilizador: new mongoose.Types.ObjectId(id_utilizador),
        id_serie: parseInt(id_serie),
        visto: visto,
        a_ver: a_ver,
      });
    }

    await serieUtilizador.save();

    res.status(201).json({
      message: "Série adicionada ou atualizada na lista do utilizador.",
      serieUtilizador,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erro ao adicionar a série à lista do utilizador." });
  }
});

// ATUALIZAR SERIEUTILIZADOR (INSERIR COMENTÁRIO E AVALIAÇÃO)
app.put("/utilizador-serie/update", async (req, res) => {
  const { id_utilizador, id_serie, avaliacao, comentario } = req.body;

  try {
    let serieUtilizador = await UtilizadorSerie.findOne({
      id_utilizador,
      id_serie,
    });

    if (serieUtilizador) {
      if (typeof avaliacao !== "undefined") {
        serieUtilizador.avaliacao = avaliacao;
      }
      if (comentario !== undefined && comentario.trim() !== "") {
        serieUtilizador.comentario = comentario;
        serieUtilizador.dataComentario = new Date();
      }

      await serieUtilizador.save();

      res.json({
        message: "Avaliação atualizada com sucesso.",
        serieUtilizador,
      });
    } else {
      res.status(404).json({ message: "Série não encontrada." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar avaliação." });
  }
});

// ADICIONAR SERIE
const Series = require("./models/Series");
app.post("/series/adicionar", async (req, res) => {
  let { id_serie, nome, genero, avaliacao_api } = req.body;
  let calc_avaliacao = avaliacao_api - Math.floor(avaliacao_api);

  if(calc_avaliacao == 0) {
    avaliacao_api = avaliacao_api + 0.0001
  }

  try {
    let serieExistente = await Series.findOne({ id_serie });
    if (serieExistente) {
      // Atualiza a série existente
      serieExistente.nome = nome;
      serieExistente.genero = genero;
      serieExistente.avaliacao_api = avaliacao_api;
      await serieExistente.save();
      res.json({
        message: "Série atualizada com sucesso.",
        serie: serieExistente,
      });
    } else {
      // Cria uma nova série
      const novaSerie = new Series({ id_serie, nome, genero, avaliacao_api });
      await novaSerie.save();
      res.json({ message: "Série adicionada com sucesso.", serie: novaSerie });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao adicionar a série." });
  }
});

// Listas Perfil
// FILMES A VER
app.get("/utilizador-filme/aver/:id_utilizador", async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    let filmesAVer = await UtilizadorFilme.find({ id_utilizador, a_ver: true });

    filmesAVer = await Promise.all(filmesAVer.map(async (filmeAVer) => {
      const filmeDetalhes = await Filmes.findOne({ id_filme: filmeAVer.id_filme });
      return {
        ...filmeAVer._doc,
        filme: filmeDetalhes
      };
    }));

    res.json(filmesAVer);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter lista de filmes a ver", error });
  }
});

// FILMES VISTOS
app.get("/utilizador-filme/visto/:id_utilizador", async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    let filmesVistos = await UtilizadorFilme.find({ id_utilizador, visto: true });

    filmesVistos = await Promise.all(filmesVistos.map(async (filmeVisto) => {
      const filmeDetalhes = await Filmes.findOne({ id_filme: filmeVisto.id_filme });
      return {
        ...filmeVisto._doc,
        filme: filmeDetalhes
      };
    }));

    res.json(filmesVistos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter lista de filmes vistos", error });
  }
});

//SERIES A VER
app.get("/utilizador-serie/aver/:id_utilizador", async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    let seriesAVer = await UtilizadorSerie.find({ id_utilizador, a_ver: true });

    seriesAVer = await Promise.all(seriesAVer.map(async (serieAVer) => {
      const serieDetalhes = await Series.findOne({ id_serie: serieAVer.id_serie });
      return {
        ...serieAVer._doc,
        serie: serieDetalhes
      };
    }));

    res.json(seriesAVer);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter lista de séries a ver", error });
  }
});

// SERIES VISTAS
app.get("/utilizador-serie/visto/:id_utilizador", async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    let seriesVistos = await UtilizadorSerie.find({ id_utilizador, visto: true });

    seriesVistos = await Promise.all(seriesVistos.map(async (serieVisto) => {
      const serieDetalhes = await Series.findOne({ id_serie: serieVisto.id_serie });
      return {
        ...serieVisto._doc,
        serie: serieDetalhes
      };
    }));

    res.json(seriesVistos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter lista de séries vistas", error });
  }
});

// Editar informações de um filme na lista do utilizador
app.put("/utilizador-filme/:id", async (req, res) => {
  const { id } = req.params;
  const { visto, a_ver, comentario, avaliacao } = req.body;

  try {
    const filmeAtualizado = await UtilizadorFilme.findByIdAndUpdate(
      id,
      { visto, a_ver, comentario, avaliacao },
      { new: true }
    );
    res.json(filmeAtualizado);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar avaliacao de filme", error });
  }
});

// Eliminar um filme da lista do utilizador
app.delete("/utilizador-filme/eliminar/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await UtilizadorFilme.deleteOne({ _id: id });
    if (resultado.deletedCount === 0) {
      res.status(404).json({ message: "Filme não encontrado." });
    } else {
      res.json({ message: "Filme removido com sucesso." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao eliminar registo.", error: error.message });
  }
});

// Eliminar série
app.delete("/utilizador-serie/eliminar/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await UtilizadorSerie.deleteOne({ _id: id });
    if (resultado.deletedCount === 0) {
      res.status(404).json({ message: "Série não encontrada." });
    } else {
      res.json({ message: "Série removida com sucesso." });
    }
  } catch (error) {
    console.error(error); // Log do erro no console do servidor
    res.status(500).json({ message: "Erro ao eliminar registo.", error: error.message });
  }
});

// Comentários Utilizadores Séries
app.get('/filme/comentarios/:idFilme', async (req, res) => {
  const { idFilme } = req.params;
  
  try {
    const comentarios = await UtilizadorFilme.find({ id_filme: idFilme, comentario: { $ne: null } })
      .populate('id_utilizador', 'username avatarUser')
      .select('comentario avaliacao dataComentario id_utilizador');

    const comentariosComUsername = comentarios.map(comentario => ({
      comentario: comentario.comentario,
      avaliacao: comentario.avaliacao,
      dataComentario: comentario.dataComentario,
      username: comentario.id_utilizador.username,
      avatarUser: comentario.id_utilizador.avatarUser,
    }));

    res.json({ comentarios: comentariosComUsername });
  } catch (error) {
    console.error('Erro ao obter comentários do filme:', error);
    res.status(500).json({ message: 'Erro ao obter comentários do filme', error });
  }
});

// Comentários Utilizadores Séries
app.get('/serie/comentarios/:idSerie', async (req, res) => {
  const { idSerie } = req.params;
  
  try {
    const comentarios = await UtilizadorSerie.find({ id_serie: idSerie, comentario: { $ne: null } })
      .populate('id_utilizador', 'username avatarUser')
      .select('comentario avaliacao dataComentario id_utilizador');

    const comentariosComUsername = comentarios.map(comentario => ({
      comentario: comentario.comentario,
      avaliacao: comentario.avaliacao,
      dataComentario: comentario.dataComentario,
      username: comentario.id_utilizador.username,
      avatarUser: comentario.id_utilizador.avatarUser,
    }));

    res.json({ comentarios: comentariosComUsername });
  } catch (error) {
    console.error('Erro ao obter comentários da série:', error);
    res.status(500).json({ message: 'Erro ao obter comentários da série', error });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'filmesseries/index.html'));
});

app.listen(3000, () => {
  console.log("Servidor a funcionar na porta 3000");
});
