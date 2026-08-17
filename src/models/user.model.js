import mongoose from 'mongoose';

/*
 * Documents in the `users` collection.
 *
 * `id` is the business id used across the API, separate from Mongo's own _id.
 * The snake_case property names are fixed by the API contract, so they stay as
 * they are rather than following the usual camelCase rule.
 */
const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    birthday: { type: Date, required: true },
  },
  {
    // Drop __v, so it never shows up in a response.
    versionKey: false,
    collection: 'users',
  },
);

export const User = mongoose.model('User', userSchema);
