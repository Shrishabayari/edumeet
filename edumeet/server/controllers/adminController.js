import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import asyncHandler from 'express-async-handler';

export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    res.status(400);
    throw new Error("Admin already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = new Admin({
    name,
    email,
    password: hashedPassword,
  });

  await newAdmin.save();
  res.status(201).json({ message: "Admin registered successfully" });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) {
    res.status(400); 
    throw new Error("Email not found. Please register or check your email."); 
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    res.status(400);
    throw new Error("Incorrect password. Please try again."); 
  }

  const token = jwt.sign(
    { id: admin._id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "365d" }
  );

  res.status(200).json({ message: "Login successful", token });

});