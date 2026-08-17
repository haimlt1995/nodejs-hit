import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Expose the mongoose `id` virtual instead of the raw `_id`.
        delete ret._id;
        return ret;
      },
    },
  },
);

itemSchema.index({ name: 1 });

export const Item = mongoose.model('Item', itemSchema);
