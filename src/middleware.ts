import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWTSECRET } from "./config";

export const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers["authorization"];
  const decoded = jwt.verify(header as string, JWTSECRET);
  if (decoded) {
    if (typeof decoded === "string") {
      res.status(403).json({
        message: "You are not logged in",
      });
      return;
    }
    //@ts-ignore
    req.userId = (decoded as JwtPayload).id;
    next();
  } else {
    res.status(403).json({
      message: "You are not logged in",
    });
  }
};
