const mongoose = require("mongoose");
const validator = require("validator");

const UtilizadorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
  },
  apelido: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  dataNascimento: {
    type: Date,
    required: true,
    validate: {
      validator: validator.isDate,
      message: "Data de nascimento inválida",
    },
  },
  avatarUser: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: "E-mail inválido",
    },
  },
  password_hash: {
    type: String,
    required: true,
  },
  tokenSessao: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

module.exports = mongoose.model("Utilizador", UtilizadorSchema, "utilizadores");
