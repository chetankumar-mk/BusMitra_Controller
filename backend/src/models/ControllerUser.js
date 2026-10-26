import mongoose from 'mongoose';

const controllerUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  depotId: {
    type: String,
    required: true,
    trim: true,
  },
  depotName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['controller_admin', 'controller_operator', 'controller_viewer'],
    default: 'controller_admin',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster lookups
controllerUserSchema.index({ username: 1 });
controllerUserSchema.index({ depotId: 1 });

// Method to compare password
controllerUserSchema.methods.comparePassword = async function(candidatePassword) {
  // This will be implemented with bcrypt in the password helper
  // The actual comparison will be done in the auth service
  return false;
};

export default mongoose.model('ControllerUser', controllerUserSchema);
