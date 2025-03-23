const bcrypt = require('bcryptjs');

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10); // Generate a salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password
    return hashedPassword;
}

// Example usage when creating a new student:
async function createStudent(studentId, password) {
    const hashedPassword = await hashPassword(password);
    const newStudent = new Student({
        studentId: studentId,
        password: hashedPassword,
    });
    await newStudent.save();
}