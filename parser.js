import { addNewPost, getAllPostLinks } from "./new-parser-functions.js";

const newPosts = async () => {
  const allPostDonorSlug = await getAllPostLinks();
  const allOurPostSlug = await getOwnPosts();

  if (allPostDonorSlug.length === 0) {
    console.log("No links found. Exiting process.");
    return [];
  }

  let posts = [];
  for (const url of allPostDonorSlug) {
    // if (!allOurPostSlug.includes(url)) { // це тупа перевірка, як можна порівнювати урл?
    const post = await addNewPost(url);
    posts.push(post);
    // }
  }
  //   console.log("All new posts:", posts);
  return posts;
};

newPosts().catch(console.error);

export const getOwnPosts = async () => {
  const response = await fetch("https://buycrypt.com/blog/wp-json/wp/v2/posts");
  const posts = await response.json();
  const pattern = /([^/]+)\/?$/;
  const postsUrl = [];
  posts.map((post) => {
    postsUrl.push(post.link.match(pattern)[1]);
  });
  return postsUrl;
};
