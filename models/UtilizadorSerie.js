const mongoose = require("mongoose");

const UtilizadorSerieSchema = new mongoose.Schema({
  id_utilizador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizador",
    required: true,
  },
  id_serie: { type: Number, required: true },
  visto: { type: Boolean, required: true },
  a_ver: { type: Boolean, required: true },
  comentario: { type: String },
  avaliacao: { type: Number },
  dataComentario: { type: Date },
  serie: { type: mongoose.Schema.Types.ObjectId, ref: "Series" },
});

module.exports = mongoose.model(
  "UtilizadorSerie",
  UtilizadorSerieSchema,
  "utilizadores_series"
);
