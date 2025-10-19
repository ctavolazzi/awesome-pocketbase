/**
 * Feed Action Creators
 * High-level actions for post feed management
 */

import { createAction, createAsyncAction } from '../action-system.js';
import * as types from '../action-types.js';

/**
 * Create post with optimistic UI
 */
export const createPost = (postData) => createAsyncAction(
  async (dispatch, getState) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticPost = {
      ...postData,
      id: tempId,
      created: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0
    };

    // Optimistic update
    dispatch(createAction(types.POST_CREATE_OPTIMISTIC, { post: optimisticPost }));

    try {
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      const savedPost = await dataService.createPost(postData);
      
      // Replace optimistic with real
      dispatch(createAction(types.POST_CREATE_SUCCESS, { 
        tempId, 
        post: savedPost 
      }));
      
      return savedPost;
    } catch (error) {
      // Remove optimistic on failure
      dispatch(createAction(types.POST_CREATE_FAILURE, { 
        tempId,
        error: error.message || 'Failed to create post' 
      }));
      throw error;
    }
  }
);

/**
 * Load page of posts
 */
export const loadPosts = (page = 1, perPage = 20) => createAsyncAction(
  async (dispatch, getState) => {
    dispatch(createAction(types.POST_LOAD_PAGE, { page, perPage }));

    try {
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      const result = await dataService.getPosts(page, perPage);
      
      dispatch(createAction(types.POST_LOAD_SUCCESS, {
        posts: result.items,
        page,
        totalItems: result.totalItems,
        hasMore: result.page < result.totalPages
      }));
      
      return result;
    } catch (error) {
      dispatch(createAction(types.POST_LOAD_FAILURE, { 
        error: error.message || 'Failed to load posts' 
      }));
      throw error;
    }
  }
);

/**
 * Vote on a post
 */
export const votePost = (postId, voteType) => createAsyncAction(
  async (dispatch, getState) => {
    try {
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      const updatedPost = await dataService.votePost(postId, voteType);
      
      dispatch(createAction(types.POST_VOTE, {
        postId: updatedPost.id,
        upvotes: updatedPost.upvotes,
        downvotes: updatedPost.downvotes,
        upvotedBy: updatedPost.upvotedBy,
        downvotedBy: updatedPost.downvotedBy
      }));
      
      return updatedPost;
    } catch (error) {
      console.error('Vote error:', error);
      throw error;
    }
  }
);

/**
 * Delete a post
 */
export const deletePost = (postId) => createAsyncAction(
  async (dispatch, getState) => {
    try {
      const dataService = window.__dataService__;
      if (!dataService) {
        throw new Error('DataService not available');
      }

      await dataService.deletePost(postId);
      
      dispatch(createAction(types.POST_DELETE, { postId }));
      
      return postId;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }
);

/**
 * Update a post
 */
export const updatePost = (post) => createAction(types.POST_UPDATE, { post });

/**
 * Refresh feed
 */
export const refreshFeed = () => loadPosts(1);

/**
 * Mark new posts as viewed
 */
export const viewNewPosts = () => createAction(types.FEED_NEW_POSTS_VIEWED);

/**
 * Indicate new posts available
 */
export const newPostsAvailable = (count = 1) => 
  createAction(types.FEED_NEW_POSTS_AVAILABLE, { count });

