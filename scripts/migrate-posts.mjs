import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';

const pb = new PocketBase(BASE_URL);

async function migratePosts() {
  try {
    console.log('▶ Authenticating as admin');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('   ✓ Admin authenticated');

    console.log('\n▶ Migrating existing posts');
    const posts = await pb.collection('posts').getFullList({
      requestKey: null,
    });

    for (const post of posts) {
      // Check if post already has the new fields
      if (post.upvotes === undefined || post.upvotes === null) {
        try {
          await pb.collection('posts').update(post.id, {
            upvotes: 0,
            downvotes: 0,
            upvotedBy: [],
            downvotedBy: [],
          }, { requestKey: null });
          console.log(`   ✓ Updated post ${post.id}`);
        } catch (error) {
          console.log(`   ✗ Failed to update post ${post.id}: ${error.message}`);
        }
      } else {
        console.log(`   ↺ Post ${post.id} already migrated`);
      }
    }

    console.log('\n🎉 Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed');
    console.error(error);
    if (error.response?.data) {
      console.error('\nDetailed error:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    pb.authStore.clear();
  }
}

migratePosts();

