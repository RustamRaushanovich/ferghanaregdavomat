const fs = require('fs');
const path = require('path');
const { USERS, sanitizeLogin, saveUsers } = require('../src/utils/auth');
const schoolsDB = require('../src/database/schools.json');

console.log("Seeding school users...");
let count = 0;

Object.keys(schoolsDB).forEach(district => {
    if (district === "Test rejimi") return;

    schoolsDB[district].forEach(school => {
        const login = sanitizeLogin(school) + "_" + sanitizeLogin(district);
        if (!USERS[login]) {
            USERS[login] = {
                password: "123", // Default password
                role: "school",
                district: district,
                school: school
            };
            count++;
        }
    });
});

saveUsers();
console.log(`Done! Added ${count} school users.`);
process.exit(0);
