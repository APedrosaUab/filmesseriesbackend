const mongoose = require("mongoose");

const UtilizadorFilmeSchema = new mongoose.Schema({
  id_utilizador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizador",
    required: true,
  },
  id_filme: { type: Number, required: true },
  visto: { type: Boolean, required: true },
  a_ver: { type: Boolean, required: true },
  comentario: { type: String },
  avaliacao: { type: Number },
  dataComentario: { type: Date },
  filme: { type: mongoose.Schema.Types.ObjectId, ref: "Filmes" },
});

module.exports = mongoose.model(
  "UtilizadorFilme",
  UtilizadorFilmeSchema,
  "utilizadores_filmes"
);
