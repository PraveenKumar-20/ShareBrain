import express, { json } from "express";
import { z } from "zod";
import bcrypt, { hash } from "bcrypt";
import { ContentModel, LinkModel, UserModel } from "./db";
import jwt from "jsonwebtoken";
import { JWTSECRET } from "./config";
import { userMiddleware } from "./middleware";
import { random } from "./utils";
const app = express();
app.use(express.json());

app.post("/api/v1/signup", async (req, res) => {
  const reqBody = z.object({
    username: z.string().min(3).max(50).email(),
    password: z
      .string()
      .min(6)
      .refine((password) => /[A-Z]/.test(password), {
        message: "Password required atleast one upper case letter",
      })
      .refine((password) => /[a-z]/.test(password), {
        message: "Password require atleast one lower case letter",
      })
      .refine((password) => /[0-9]/.test(password), {
        message: "Password require atleast one number",
      })
      .refine((password) => /[!@#$%^&*]/.test(password), {
        message: "Password require atleast one special character",
      }),
  });

  const parsedData = reqBody.safeParse(req.body);

  if (!parsedData.success) {
    res.send({
      message: "Incorrect Format",
      error: parsedData.error,
    });
    return;
  }

  const username = req.body.username;
  const password = req.body.password;

  const hashedPassword = await bcrypt.hash(password, 10);

  const foundUser = await UserModel.findOne({
    username: username,
  });

  if (foundUser) {
    res.status(403).send({
      message: "Account already exists Please SignIn",
    });
  } else {
    await UserModel.create({
      username: username,
      password: hashedPassword,
    });

    res.send({
      message: "User SignedUp Successfully",
    });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  const reqBody = z.object({
    username: z.string().min(3).max(50).email(),
    password: z
      .string()
      .min(6)
      .refine((password) => /[A-Z]/.test(password), {
        message: "Password required atleast one upper case letter",
      })
      .refine((password) => /[a-z]/.test(password), {
        message: "Password require atleast one lower case letter",
      })
      .refine((password) => /[0-9]/.test(password), {
        message: "Password require atleast one number",
      })
      .refine((password) => /[!@#$%^&*]/.test(password), {
        message: "Password require atleast one special character",
      }),
  });

  const parsedData = reqBody.safeParse(req.body);

  if (!parsedData.success) {
    res.send({
      message: "Incorrect Format",
      error: parsedData.error,
    });
    return;
  }

  const username = req.body.username;
  const password = req.body.password;

  const user = await UserModel.findOne({
    username,
  });

  if (user && user.password) {
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign(
        {
          id: user?._id.toString(),
        },
        JWTSECRET
      );

      res.send({
        token,
      });
    } else {
      res.status(403).send({
        message: "Invalid Username or Password",
      });
    }
  } else {
    res.send({
      message: "Account does not exist!Please Sign Up",
    });
  }
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
  const { link, type, title } = req.body;

  await ContentModel.create({
    link,
    type,
    title,
    //@ts-ignore
    userId: req.userId,
    tags: [],
  });

  res.json({
    message: "Content Added",
  });
});

app.get("/api/v1/content", userMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = req.userId;
  const content = await ContentModel.find({
    userId: userId,
  }).populate("userId", "username");

  res.json({
    content,
  });
});

app.delete("/api/v1/content", async (req, res) => {
  const contentId = req.body.contentId;

  await ContentModel.deleteMany({
    contentId,
    // @ts-ignore
    userId: req.userId,
  });

  res.json({
    message: "Deleted",
  });
});

app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
  const { share } = req.body;

  if (share) {
    const existingLink = await LinkModel.findOne({
      // @ts-ignore
      userId: req.userId,
    });

    if (existingLink) {
      res.json({
        hash: existingLink.hash,
      });
      return;
    }

    const hash = random(10);

    LinkModel.create({
      // @ts-ignore
      userId: req.userId,
      hash: hash,
    });

    res.json({ hash });
  } else {
    LinkModel.deleteOne({
      // @ts-ignore
      userId: req.userId,
    });
    res.json({
      message: "Removed Link",
    });
  }
});

app.get("/api/v1/brain/:shareLink", async (req, res) => {
  const hash = req.params.shareLink;

  const link = await LinkModel.findOne({
    hash,
  });

  if (!link) {
    res.status(404).json({
      message: "Invalid share Link",
    });
    return;
  }

  const content = await ContentModel.find({
    userId: link.userId,
  });

  const user = await UserModel.findOne({
    _id: link.userId,
  });

  if (!user) {
    res.status(404).json({
      message: "User not found",
    });
    return;
  }
  res.json({
    username: user.username,
    content,
  });
});

app.listen(3000);
