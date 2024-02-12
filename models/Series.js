const mongoose = require("mongoose");

const SeriesSchema = new mongoose.Schema({
  id_serie: { type: Number, required: true, unique: true },
  nome: { type: String, required: true },
  genero: [{ type: String, required: true }],
  avaliacao_api: { type: Number, required: true },
});

module.exports = mongoose.model("Series", SeriesSchema);
