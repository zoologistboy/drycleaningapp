// utils/loyalty.js
const calculateLoyaltyPoints = (orderTotal) => {
  // 1 point per ₦100 spent
  return Math.floor(orderTotal / 100); 
};

const getLoyaltyTier = (points) => {
  if (points >= 1000) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
};