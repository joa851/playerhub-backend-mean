const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  latitude:  { type: Number },
  longitude: { type: Number },
}, { _id: false });

const birthSchema = new mongoose.Schema({
  date:    { type: String },
  place:   { type: String },
  country: { type: String },
}, { _id: false });

// Comment embebido dentro del player.
// Tiene _id propio (default true) para poder borrarlo por id.
const commentSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000, 
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  location: locationSchema,
}, { timestamps: true });


const playerSchema = new mongoose.Schema({
  // Id en API-Football. Único cuando existe (los importados); null para
  // jugadores creados desde formulario.
  externalId: {
    type: Number,
    index: true,
    sparse: true,    // permite múltiples docs con externalId null
    unique: true,
  },
  name:       { type: String, required: true, trim: true, index: true },
  firstname:  { type: String },
  lastname:   { type: String },
  age:        { type: Number, min: 0 },
  birth:      birthSchema,
  nationality:{ type: String },
  height:     { type: String },
  weight:     { type: String },
  number:     { type: Number },
  position:   { type: String },
  photo:      { type: String },
  team:       { type: String, index: true },
  league:     { type: String, index: true },
  location:   locationSchema,
  // Array de comments embebidos.
  comments:   { type: [commentSchema], default: [] },
}, { timestamps: true });   // adds createdAt + updatedAt

module.exports = mongoose.model('Player', playerSchema);
