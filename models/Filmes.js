const mongoose = require("mongoose");

const FilmesSchema = new mongoose.Schema({
  id_filme: { type: Number, required: true, unique: true },
  nome: { type: String, required: true },
  genero: [{ type: String, required: true }],
  avaliacao_api: { type: Number, required: true },
});

module.exports = mongoose.model("Filmes", FilmesSchema);
