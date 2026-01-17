// usernameGenerator.js
// Generates random usernames in the format: TwoWords123

const adjectives = [
    "Swift", "Bold", "Bright", "Cool", "Dark", "Epic", "Fire", "Golden",
    "Happy", "Iron", "Jade", "Lucky", "Mystic", "Noble", "Ocean", "Prime",
    "Quick", "Royal", "Silent", "Thunder", "Ultra", "Vivid", "Wild", "Zenith",
    "Cosmic", "Cyber", "Digital", "Electric", "Neon", "Quantum", "Stellar",
    "Turbo", "Velocity", "Shadow", "Phoenix", "Dragon", "Tiger", "Wolf",
    "Raven", "Falcon", "Viper", "Crimson", "Azure", "Emerald", "Silver"
];

const nouns = [
    "Warrior", "Hunter", "Ranger", "Knight", "Wizard", "Ninja", "Samurai",
    "Pirate", "Rider", "Guardian", "Champion", "Master", "Legend", "Hero",
    "Rebel", "Spirit", "Ghost", "Storm", "Blade", "Arrow", "Hammer", "Shield",
    "Sword", "Fist", "Titan", "Giant", "Demon", "Angel", "Beast", "Phoenix",
    "Dragon", "Tiger", "Wolf", "Bear", "Lion", "Eagle", "Hawk", "Panther",
    "Viper", "Cobra", "Raptor", "Spartan", "Viking", "Ronin", "Shogun"
];

/**
 * Generates a random username in format: AdjectiveNoun123
 * Example: SwiftWarrior42, BoldNinja789
 */
function generateRandomUsername() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumbers = Math.floor(Math.random() * 900) + 100; // 3-digit number (100-999)

    return `${randomAdjective}${randomNoun}${randomNumbers}`;
}

module.exports = { generateRandomUsername };
