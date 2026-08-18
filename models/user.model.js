import mongoose from 'mongoose';

// shape of a user document
const userSchema = new mongoose.Schema(
  {
    // the user id people actually use, not mongo's _id
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    birthday: { type: Date, required: true },
  },
  {
    // keeps __v out of the replies
    versionKey: false,
    collection: 'users',
  },
);

export const User = mongoose.model('User', userSchema);
