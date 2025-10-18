import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = 'porchroot@gmail.com';
const ADMIN_PASSWORD = 'AdminPassword69!';

async function main() {
  try {
    // Authenticate as admin
    console.log('Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Authenticated successfully!\n');

    // Fetch posts from the collection
    console.log('Fetching posts...');
    const posts = await pb.collection('posts').getFullList({
      sort: '-created',
    });

    console.log(`Found ${posts.length} post(s):\n`);
    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   Content: ${post.content}`);
      console.log(`   Created: ${post.created}\n`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.status === 401) {
      console.log('\n⚠️  Make sure to update ADMIN_EMAIL and ADMIN_PASSWORD in script.mjs');
    } else if (error.status === 404) {
      console.log('\n⚠️  Make sure you created the "posts" collection in the Admin UI');
    }
  }
}

main();

