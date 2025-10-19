// store/feed.store.js - Feed/posts state management
import { Store } from './store.js';

export const feedStore = new Store('feed', {
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  perPage: 20,
  totalItems: 0,
  filter: {
    category: null,
    author: null,
    search: null
  },
  sort: '-id', // Sort by ID descending (newest first)
  newPostsAvailable: false,
  newPostsCount: 0,
  lastFetch: null
});

// Feed events
export const FEED_EVENTS = {
  POSTS_REQUEST: 'feed/posts/request',
  POSTS_SUCCESS: 'feed/posts/success',
  POSTS_ERROR: 'feed/posts/error',
  POST_CREATE: 'feed/post/create',
  POST_UPDATE: 'feed/post/update',
  POST_DELETE: 'feed/post/delete',
  NEW_POSTS_AVAILABLE: 'feed/new_posts/available',
  FILTER_CHANGE: 'feed/filter/change'
};

// Helper functions

export function setFeedLoading(loading = true) {
  feedStore.setState('loading', loading);
}

export function setFeedPosts(posts, page = 1, totalItems = 0) {
  feedStore.batchUpdate({
    posts: page === 1 ? posts : [...feedStore.getState('posts'), ...posts],
    loading: false,
    error: null,
    page,
    totalItems,
    hasMore: posts.length === feedStore.getState('perPage'),
    lastFetch: Date.now()
  });
}

export function setFeedError(error) {
  feedStore.batchUpdate({
    loading: false,
    error: error.message || String(error)
  });
}

export function addPost(post) {
  const posts = feedStore.getState('posts');

  // Add to beginning (optimistic UI)
  feedStore.batchUpdate({
    posts: [post, ...posts],
    totalItems: feedStore.getState('totalItems') + 1
  });
}

export function updatePost(postId, updates) {
  const posts = feedStore.getState('posts');
  const index = posts.findIndex(p => p.id === postId);

  if (index !== -1) {
    const updatedPosts = [...posts];
    updatedPosts[index] = { ...updatedPosts[index], ...updates };
    feedStore.setState('posts', updatedPosts);
  }
}

export function deletePost(postId) {
  const posts = feedStore.getState('posts');
  feedStore.batchUpdate({
    posts: posts.filter(p => p.id !== postId),
    totalItems: feedStore.getState('totalItems') - 1
  });
}

export function setFilter(filterKey, value) {
  feedStore.setState(`filter.${filterKey}`, value);
}

export function clearFilter() {
  feedStore.setState('filter', {
    category: null,
    author: null,
    search: null
  });
}

export function setNewPostsAvailable(count) {
  feedStore.batchUpdate({
    newPostsAvailable: count > 0,
    newPostsCount: count
  });
}

export function clearNewPosts() {
  feedStore.batchUpdate({
    newPostsAvailable: false,
    newPostsCount: 0
  });
}

export function resetFeed() {
  feedStore.batchUpdate({
    posts: [],
    page: 1,
    hasMore: true,
    newPostsAvailable: false,
    newPostsCount: 0,
    error: null
  });
}

export default feedStore;

