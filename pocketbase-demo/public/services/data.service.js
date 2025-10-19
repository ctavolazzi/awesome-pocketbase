/**
 * Data Service Layer
 * Centralizes all PocketBase database calls with validation and error handling
 */

import { validate } from '../utils/validator.js';
import { postCreateSchema, postUpdateSchema } from '../schemas/post.schema.js';
import { userCreateSchema, authSchema } from '../schemas/user.schema.js';
import { statsUpdateSchema } from '../schemas/stats.schema.js';
import * as logger from '../utils/logger.js';

class DataService {
  constructor() {
    this.pb = null;
  }

  /**
   * Initialize the service with a PocketBase instance
   * @param {PocketBase} pbInstance - PocketBase instance
   */
  init(pbInstance) {
    this.pb = pbInstance;
  }

  /**
   * Get the current authenticated user
   * @returns {Object|null} Current user or null
   */
  getCurrentUser() {
    return this.pb?.authStore?.model || null;
  }

  // ============ POSTS ============

  /**
   * Get paginated list of posts
   * @param {number} page - Page number
   * @param {number} perPage - Items per page
   * @param {Object} options - Additional options (expand, sort, filter, etc.)
   * @returns {Promise<Object>} List result with items and pagination info
   */
  async getPosts(page = 1, perPage = 20, options = {}) {
    try {
      const defaultOptions = {
        expand: 'author,categories',
        ...options,
      };

      return await this.pb.collection('posts').getList(page, perPage, defaultOptions);
    } catch (error) {
      const message = `Failed to load posts: ${error?.message || error}`;
      logger.error(message, { page, perPage, options }, error);
      throw new Error(message);
    }
  }

  /**
   * Get a single post by ID
   * @param {string} id - Post ID
   * @param {Object} options - Additional options (expand, etc.)
   * @returns {Promise<Object>} Post record
   */
  async getPost(id, options = {}) {
    try {
      const defaultOptions = {
        expand: 'author,categories',
        ...options,
      };

      return await this.pb.collection('posts').getOne(id, defaultOptions);
    } catch (error) {
      const message = `Failed to load post: ${error?.message || error}`;
      logger.error(message, { id, options }, error);
      throw new Error(message);
    }
  }

  /**
   * Create a new post
   * @param {Object} data - Post data
   * @returns {Promise<Object>} Created post record
   */
  async createPost(data) {
    // Validate data
    const validation = validate(data, postCreateSchema);
    if (!validation.valid) {
      const message = `Validation failed: ${validation.errors.join(', ')}`;
      logger.warn(message, { data, errors: validation.errors });
      throw new Error(message);
    }

    try {
      const result = await this.pb.collection('posts').create(data, { requestKey: null });
      logger.info('Post created successfully', { postId: result.id, title: data.title });
      return result;
    } catch (error) {
      const message = `Failed to create post: ${error?.message || error}`;
      logger.error(message, { data }, error);
      throw new Error(message);
    }
  }

  /**
   * Update an existing post
   * @param {string} id - Post ID
   * @param {Object} data - Updated post data
   * @returns {Promise<Object>} Updated post record
   */
  async updatePost(id, data) {
    // Validate data
    const validation = validate(data, postUpdateSchema);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      return await this.pb.collection('posts').update(id, data, { requestKey: null });
    } catch (error) {
      throw new Error(`Failed to update post: ${error?.message || error}`);
    }
  }

  /**
   * Delete a post
   * @param {string} id - Post ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePost(id) {
    try {
      const result = await this.pb.collection('posts').delete(id, { requestKey: null });
      logger.info('Post deleted successfully', { postId: id });
      return result;
    } catch (error) {
      const message = `Failed to delete post: ${error?.message || error}`;
      logger.error(message, { id }, error);
      throw new Error(message);
    }
  }

  /**
   * Vote on a post (upvote or downvote)
   * @param {string} postId - Post ID
   * @param {string} voteType - 'up' or 'down'
   * @returns {Promise<Object>} Updated post record
   */
  async votePost(postId, voteType) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Must be authenticated to vote');
    }

    try {
      const post = await this.getPost(postId);
      const upvotedBy = post.upvotedBy || [];
      const downvotedBy = post.downvotedBy || [];
      const userId = currentUser.id;

      let newUpvotedBy = [...upvotedBy];
      let newDownvotedBy = [...downvotedBy];
      let upvotes = post.upvotes || 0;
      let downvotes = post.downvotes || 0;

      if (voteType === 'up') {
        if (upvotedBy.includes(userId)) {
          // Remove upvote
          newUpvotedBy = upvotedBy.filter(id => id !== userId);
          upvotes = Math.max(0, upvotes - 1);
        } else {
          // Add upvote, remove downvote if exists
          newUpvotedBy = [...upvotedBy, userId];
          upvotes = upvotes + 1;
          if (downvotedBy.includes(userId)) {
            newDownvotedBy = downvotedBy.filter(id => id !== userId);
            downvotes = Math.max(0, downvotes - 1);
          }
        }
      } else if (voteType === 'down') {
        if (downvotedBy.includes(userId)) {
          // Remove downvote
          newDownvotedBy = downvotedBy.filter(id => id !== userId);
          downvotes = Math.max(0, downvotes - 1);
        } else {
          // Add downvote, remove upvote if exists
          newDownvotedBy = [...downvotedBy, userId];
          downvotes = downvotes + 1;
          if (upvotedBy.includes(userId)) {
            newUpvotedBy = upvotedBy.filter(id => id !== userId);
            upvotes = Math.max(0, upvotes - 1);
          }
        }
      }

      const result = await this.updatePost(postId, {
        upvotes,
        downvotes,
        upvotedBy: newUpvotedBy,
        downvotedBy: newDownvotedBy,
      });

      logger.info('Post vote updated', { postId, voteType, upvotes, downvotes });
      return result;
    } catch (error) {
      const message = `Failed to vote on post: ${error?.message || error}`;
      logger.error(message, { postId, voteType }, error);
      throw new Error(message);
    }
  }

  // ============ USERS ============

  /**
   * Create a new user
   * @param {Object} data - User data (email, password, passwordConfirm, displayName, bio)
   * @returns {Promise<Object>} Created user record
   */
  async createUser(data) {
    // Validate data
    const validation = validate(data, userCreateSchema);
    if (!validation.valid) {
      const message = `Validation failed: ${validation.errors.join(', ')}`;
      logger.warn(message, { email: data.email, errors: validation.errors });
      throw new Error(message);
    }

    // Additional validation: passwords match
    if (data.password !== data.passwordConfirm) {
      const message = 'Passwords do not match';
      logger.warn(message, { email: data.email });
      throw new Error(message);
    }

    try {
      const result = await this.pb.collection('users').create(data);
      logger.info('User created successfully', { userId: result.id, email: data.email });
      return result;
    } catch (error) {
      const message = `Failed to create user: ${error?.message || error}`;
      logger.error(message, { email: data.email }, error);
      throw new Error(message);
    }
  }

  /**
   * Authenticate with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Auth response with token and user
   */
  async authWithPassword(email, password) {
    // Validate credentials
    const validation = validate({ email, password }, authSchema);
    if (!validation.valid) {
      const message = `Validation failed: ${validation.errors.join(', ')}`;
      logger.warn(message, { email, errors: validation.errors });
      throw new Error(message);
    }

    try {
      const result = await this.pb.collection('users').authWithPassword(email, password);
      logger.info('User authenticated successfully', { userId: result.record.id, email });
      return result;
    } catch (error) {
      const message = `Authentication failed: ${error?.message || error}`;
      logger.error(message, { email }, error);
      throw new Error(message);
    }
  }

  // ============ CATEGORIES ============

  /**
   * Get all categories
   * @returns {Promise<Object>} List of categories
   */
  async getCategories() {
    try {
      return await this.pb.collection('categories').getList(1, 100, { sort: 'label' });
    } catch (error) {
      const message = `Failed to load categories: ${error?.message || error}`;
      logger.error(message, {}, error);
      throw new Error(message);
    }
  }

  // ============ COMMENTS ============

  /**
   * Get comments for a post
   * @param {string} postId - Post ID
   * @returns {Promise<Array>} List of comments
   */
  async getComments(postId) {
    try {
      const result = await this.pb.collection('comments').getList(1, 500, {
        filter: `post="${postId}"`,
        expand: 'author,parentComment',
        sort: 'created',
      });
      return result.items;
    } catch (error) {
      const message = `Failed to load comments: ${error?.message || error}`;
      logger.error(message, { postId }, error);
      throw new Error(message);
    }
  }

  /**
   * Create a new comment
   * @param {string} postId - Post ID
   * @param {string} content - Comment content
   * @param {string|null} parentId - Parent comment ID (for replies)
   * @returns {Promise<Object>} Created comment record
   */
  async createComment(postId, content, parentId = null) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Must be authenticated to comment');
    }

    try {
      const data = {
        post: postId,
        content,
        author: currentUser.id,
        upvotes: 0,
        downvotes: 0,
      };

      if (parentId) {
        data.parentComment = parentId;
      }

      const result = await this.pb.collection('comments').create(data, { requestKey: null });
      logger.info('Comment created successfully', { commentId: result.id, postId });
      return result;
    } catch (error) {
      const message = `Failed to create comment: ${error?.message || error}`;
      logger.error(message, { postId, parentId }, error);
      throw new Error(message);
    }
  }

  /**
   * Vote on a comment (upvote or downvote)
   * @param {string} commentId - Comment ID
   * @param {string} voteType - 'up' or 'down'
   * @returns {Promise<Object>} Updated comment record
   */
  async voteComment(commentId, voteType) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Must be authenticated to vote');
    }

    try {
      const comment = await this.pb.collection('comments').getOne(commentId);
      let upvotes = comment.upvotes || 0;
      let downvotes = comment.downvotes || 0;

      // Simple vote counting (can be enhanced with user tracking like posts)
      if (voteType === 'up') {
        upvotes += 1;
      } else if (voteType === 'down') {
        downvotes += 1;
      }

      const result = await this.pb.collection('comments').update(commentId, {
        upvotes,
        downvotes,
      });

      logger.info('Comment vote updated', { commentId, voteType, upvotes, downvotes });
      return result;
    } catch (error) {
      const message = `Failed to vote on comment: ${error?.message || error}`;
      logger.error(message, { commentId, voteType }, error);
      throw new Error(message);
    }
  }

  /**
   * Delete a comment
   * @param {string} id - Comment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteComment(id) {
    try {
      const result = await this.pb.collection('comments').delete(id, { requestKey: null });
      logger.info('Comment deleted successfully', { commentId: id });
      return result;
    } catch (error) {
      const message = `Failed to delete comment: ${error?.message || error}`;
      logger.error(message, { id }, error);
      throw new Error(message);
    }
  }

  // ============ SITE STATS ============

  /**
   * Get site stats
   * @returns {Promise<Object>} Site stats record
   */
  async getStats() {
    try {
      const result = await this.pb.collection('site_stats').getList(1, 1);
      if (result.items.length === 0) {
        const message = 'No site stats record found';
        logger.warn(message);
        throw new Error(message);
      }
      return result.items[0];
    } catch (error) {
      const message = `Failed to load stats: ${error?.message || error}`;
      logger.error(message, {}, error);
      throw new Error(message);
    }
  }

  /**
   * Update hit counter
   * @returns {Promise<Object>} Updated stats and new count
   */
  async updateHitCounter() {
    try {
      const stats = await this.getStats();
      const currentCount = typeof stats.visitor_count === 'number' ? stats.visitor_count : 0;
      const newCount = currentCount + 1;

      const updateData = {
        visitor_count: newCount,
        last_visit: new Date().toISOString(),
      };

      // Validate update data
      const validation = validate(updateData, statsUpdateSchema);
      if (!validation.valid) {
        const message = `Validation failed: ${validation.errors.join(', ')}`;
        logger.warn(message, { updateData, errors: validation.errors });
        throw new Error(message);
      }

      await this.pb.collection('site_stats').update(stats.id, updateData);
      logger.debug('Hit counter updated', { oldCount: currentCount, newCount });

      return { stats, newCount };
    } catch (error) {
      const message = `Failed to update hit counter: ${error?.message || error}`;
      logger.error(message, {}, error);
      throw new Error(message);
    }
  }

  // ============ REALTIME ============

  /**
   * Subscribe to realtime updates for a collection
   * @param {string} collection - Collection name
   * @param {string} recordId - Record ID or '*' for all records
   * @param {Function} callback - Callback function for updates
   * @returns {Promise<void>}
   */
  async subscribeToCollection(collection, recordId, callback) {
    try {
      logger.debug('Subscribing to realtime updates', { collection, recordId });
      return await this.pb.collection(collection).subscribe(recordId, callback);
    } catch (error) {
      const message = `Failed to subscribe to ${collection}: ${error?.message || error}`;
      logger.error(message, { collection, recordId }, error);
      throw new Error(message);
    }
  }

  /**
   * Unsubscribe from all realtime connections
   */
  unsubscribeAll() {
    if (this.pb?.realtime) {
      this.pb.realtime.unsubscribeAll();
    }
  }

  /**
   * Disconnect from realtime
   */
  disconnect() {
    if (this.pb?.realtime) {
      this.pb.realtime.disconnect();
    }
  }
}

// Export singleton instance
export const dataService = new DataService();

