import mongoose from 'mongoose';

const depotSchema = new mongoose.Schema({
  depotId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  depotName: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster lookups
depotSchema.index({ depotId: 1 });
depotSchema.index({ code: 1 });

export default mongoose.model('Depot', depotSchema);
