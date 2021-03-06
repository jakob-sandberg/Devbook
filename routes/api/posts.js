const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Post = require("../../models/Posts");

router.post(
  "/",
  [auth, [check("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server Error");
    }
  }
);

//GET all posts
router.get("/", auth, async (req, res) => {
  try {
    const posts = await await Post.find().sort({ date: -1 });

    if (!posts) {
      return res.status(404).json({ msg: "No post found" });
    }
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server Error");
  }
});

//GET a post by id
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "No post found" });
    }
    res.status(500).json("Server Error");
  }
});

//DELETE a post by id
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "No post found" });
    }

    // check user

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "user not authorized" });
    }
    await post.remove();

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "No post found" });
    }
    res.status(500).json("Server Error");
  }
});

// @route    PUT api/posts/like/:id
// @desc     Like a post
// @access   Private

router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //Check if the post has alrady been liked
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({ msg: "The post has alrady been liked" });
    }
    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server Error");
  }
});

// @route    PUT api/posts/unlike/:id
// @desc     Unlike a post
// @access   Private

router.put("/unlike/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //Check if the post has alrady been liked
    if (
      (post.likes.filter(
        (like) => like.user.toString() === req.user.id
      ).length = 0)
    ) {
      return res.status(400).json({ msg: "The post has not been liked" });
    }
    // Remove index
    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server Error");
  }
});

// @route    POST api/posts/comment/:id
// @desc     comment on a post
// @access   Private

router.post(
  "/comment/:id",
  [auth, [check("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();
      res.json(post.comment);
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server Error");
    }
  }
);

// @route    DELETE  api/posts/comment/:id
// @desc     comment on a post
// @access   Private

router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //Pull out comment
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    //make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exists" });
    }

    //Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }
    //GET remove index
    const removeIndex = post.comments
      .map((comment) => comment.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);

    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server Error");
  }
});

module.exports = router;
