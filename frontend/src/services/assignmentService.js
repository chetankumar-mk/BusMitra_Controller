import { apiClient } from '../api/apiClient';

/**
 * Assignment Service
 * Handles all assignment-related API calls
 */

export const assignmentService = {
  /**
   * Get all assignments
   * @returns {Promise<Object>} Assignments response
   */
  async getAssignments() {
    return await apiClient.get('/api/controller/assignments');
  },

  /**
   * Get a specific assignment by ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object>} Assignment response
   */
  async getAssignmentById(assignmentId) {
    return await apiClient.get(`/api/controller/assignments/${assignmentId}`);
  },

  /**
   * Create a new assignment
   * @param {Object} assignmentData - Assignment data
   * @param {string} assignmentData.driverUid - Driver UID
   * @param {string} assignmentData.busId - Bus ID
   * @param {string} assignmentData.routeId - Route ID
   * @param {string} assignmentData.scheduledDate - Scheduled date (YYYY-MM-DD)
   * @param {string} assignmentData.scheduledDepartureTime - Scheduled departure time (HH:mm)
   * @returns {Promise<Object>} Created assignment response
   */
  async createAssignment(assignmentData) {
    return await apiClient.post('/api/controller/assignments', assignmentData);
  }
};

/**
 * Route Service
 * Handles all route-related API calls
 */

export const routeService = {
  /**
   * Get all routes
   * @returns {Promise<Object>} Routes response
   */
  async getRoutes() {
    return await apiClient.get('/api/controller/routes');
  }
};
