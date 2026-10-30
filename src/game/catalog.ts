// Sample catalogue. Plain data, no React/three imports.
export type Shape = "box" | "tall" | "can" | "bottle" | "round" | "bag";

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string; // sign colour (hex for canvas textures)
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  mrp: number; // ₹ list price (pre-tax)
  discountPct: number; // 0-100
  gstRate: number; // e.g. 0.05
  stock: number;
  description: string;
  shape: Shape;
  color: string; // packaging colour
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: "fruits", name: "Fruits & Vegetables", emoji: "🥦", color: "#2f8f4e" },
  { id: "dairy", name: "Dairy Products", emoji: "🥛", color: "#3b7dd8" },
  { id: "snacks", name: "Snacks & Biscuits", emoji: "🍪", color: "#e0742b" },
  { id: "beverages", name: "Beverages", emoji: "🧃", color: "#c9383a" },
  { id: "grocery", name: "Rice & Groceries", emoji: "🍚", color: "#b4862a" },
  { id: "care", name: "Personal Care", emoji: "🧴", color: "#2aa3a3" },
  { id: "cleaning", name: "Household Cleaning", emoji: "🧽", color: "#5c6bc0" },
  { id: "electronics", name: "Electronics", emoji: "🔌", color: "#37474f" },
  { id: "bakery", name: "Bakery", emoji: "🥐", color: "#a0522d" },
];

type Row = [string, string, number, number, number, number, Shape, string, string, string];
// name, brand, mrp, discount%, gst%, stock, shape, colour, emoji, description
const RAW: Record<string, Row[]> = {
  fruits: [
    ["Bananas (1 dozen)", "FarmFresh", 60, 0, 0, 40, "bag", "#f2c94c", "🍌", "Ripe Robusta bananas sourced from Kerala farms."],
    ["Red Apples (1 kg)", "Himachal Orchards", 180, 10, 0, 25, "round", "#d64545", "🍎", "Crisp Shimla apples, hand picked."],
    ["Tomatoes (1 kg)", "FarmFresh", 40, 0, 0, 60, "round", "#e8553e", "🍅", "Juicy farm tomatoes for curries and salads."],
    ["Onions (1 kg)", "FarmFresh", 35, 0, 0, 80, "bag", "#a9547a", "🧅", "Nashik red onions."],
    ["Potatoes (2 kg)", "FarmFresh", 70, 5, 0, 50, "bag", "#c8a26a", "🥔", "All-purpose potatoes."],
    ["Spinach Bunch", "GreenLeaf", 25, 0, 0, 6, "bag", "#3f9e4d", "🥬", "Fresh palak, washed and bundled."],
  ],
  dairy: [
    ["Toned Milk 1 L", "Amul", 60, 0, 0, 70, "tall", "#e9f1fb", "🥛", "Pasteurised toned milk, 3% fat."],
    ["Paneer 200 g", "Amul", 95, 5, 5, 30, "box", "#f5f0e1", "🧀", "Soft malai paneer."],
    ["Curd 400 g", "Mother Dairy", 45, 0, 5, 35, "can", "#ffffff", "🥣", "Thick set dahi."],
    ["Butter 100 g", "Amul", 58, 0, 12, 40, "box", "#f7d046", "🧈", "Pasteurised salted butter."],
    ["Cheese Slices", "Britannia", 140, 10, 12, 4, "box", "#f4a940", "🧀", "10 processed cheese slices."],
    ["Ghee 500 ml", "Nandini", 320, 8, 12, 20, "can", "#e7b53b", "🫙", "Pure cow ghee."],
  ],
  snacks: [
    ["Salted Chips", "Lay's", 20, 0, 12, 90, "bag", "#f6c90e", "🥔", "Classic salted potato chips, 52 g."],
    ["Good Day Cashew", "Britannia", 35, 0, 18, 60, "box", "#e8a33d", "🍪", "Cashew cookies, 200 g."],
    ["Parle-G", "Parle", 10, 0, 18, 120, "box", "#f2d16b", "🍪", "Glucose biscuits, the original."],
    ["Aloo Bhujia", "Haldiram's", 55, 10, 12, 45, "bag", "#d7462f", "🥨", "Spicy aloo bhujia, 200 g."],
    ["Dark Fantasy", "Sunfeast", 40, 0, 18, 30, "box", "#4a2c2a", "🍫", "Choco-filled cookies."],
    ["Popcorn Butter", "Act II", 30, 15, 12, 5, "bag", "#ffd36b", "🍿", "Microwave popcorn, butter flavour."],
  ],
  beverages: [
    ["Cola 750 ml", "Thums Up", 40, 0, 28, 80, "bottle", "#2b1a1a", "🥤", "Strong fizzy cola."],
    ["Mango Drink 1.2 L", "Maaza", 70, 5, 12, 40, "bottle", "#f39c12", "🥭", "Alphonso mango drink."],
    ["Mineral Water 1 L", "Bisleri", 20, 0, 18, 150, "bottle", "#5dade2", "💧", "Packaged drinking water."],
    ["Green Tea 25 bags", "Lipton", 160, 20, 5, 25, "box", "#7cb342", "🍵", "Pure and light green tea."],
    ["Instant Coffee 100 g", "Nescafé", 310, 10, 18, 18, "can", "#6d3b1f", "☕", "Classic instant coffee."],
    ["Orange Juice 1 L", "Real", 125, 0, 12, 3, "tall", "#f57c00", "🍊", "100% orange juice."],
  ],
  grocery: [
    ["Basmati Rice 5 kg", "India Gate", 650, 12, 5, 30, "bag", "#c0392b", "🍚", "Aged long-grain basmati."],
    ["Sona Masoori 10 kg", "Daawat", 720, 5, 5, 20, "bag", "#2e86c1", "🍚", "Everyday rice."],
    ["Toor Dal 1 kg", "Tata Sampann", 165, 5, 5, 40, "bag", "#f1c40f", "🫘", "Unpolished toor dal."],
    ["Atta 5 kg", "Aashirvaad", 285, 8, 5, 35, "bag", "#e67e22", "🌾", "Whole wheat chakki atta."],
    ["Sunflower Oil 1 L", "Fortune", 155, 0, 5, 45, "bottle", "#f7dc6f", "🫗", "Refined sunflower oil."],
    ["Iodised Salt 1 kg", "Tata", 28, 0, 0, 100, "box", "#ffffff", "🧂", "Vacuum evaporated salt."],
  ],
  care: [
    ["Toothpaste 150 g", "Colgate", 99, 10, 18, 50, "box", "#e74c3c", "🪥", "Strong teeth cavity protection."],
    ["Shampoo 340 ml", "Head & Shoulders", 340, 15, 18, 22, "bottle", "#1f77b4", "🧴", "Anti-dandruff shampoo."],
    ["Bath Soap (4 pack)", "Dove", 220, 10, 18, 30, "box", "#f5f5f5", "🧼", "Moisturising beauty bar."],
    ["Face Wash 100 ml", "Himalaya", 150, 0, 18, 28, "tall", "#2ecc71", "🧴", "Neem purifying face wash."],
    ["Hand Sanitiser", "Dettol", 85, 0, 18, 7, "bottle", "#16a085", "🧴", "Kills 99.9% germs."],
    ["Coconut Hair Oil", "Parachute", 125, 5, 18, 40, "bottle", "#3498db", "🥥", "Pure coconut oil, 300 ml."],
  ],
  cleaning: [
    ["Detergent 2 kg", "Surf Excel", 360, 10, 18, 25, "bag", "#2c6fbb", "🧺", "Easy wash detergent powder."],
    ["Dishwash Gel 750 ml", "Vim", 165, 5, 18, 35, "bottle", "#7ac143", "🍋", "Lemon dishwash liquid."],
    ["Floor Cleaner 1 L", "Lizol", 210, 10, 18, 30, "bottle", "#8e44ad", "🧽", "Disinfectant surface cleaner."],
    ["Toilet Cleaner", "Harpic", 105, 0, 18, 40, "bottle", "#2980b9", "🚽", "Power plus toilet cleaner."],
    ["Scrub Pads (3)", "Scotch-Brite", 60, 0, 18, 50, "box", "#27ae60", "🧽", "Heavy duty scrub pads."],
    ["Garbage Bags", "Ezee", 99, 0, 18, 2, "box", "#34495e", "🗑️", "30 medium bags."],
  ],
  electronics: [
    ["AA Batteries (4)", "Duracell", 180, 10, 18, 40, "box", "#c9a227", "🔋", "Long-lasting alkaline batteries."],
    ["LED Bulb 9W", "Philips", 120, 20, 12, 50, "box", "#ecf0f1", "💡", "Cool daylight LED bulb."],
    ["USB-C Cable", "boAt", 299, 33, 18, 25, "box", "#e74c3c", "🔌", "1.5 m fast charging cable."],
    ["Earphones", "boAt", 799, 40, 18, 12, "box", "#111111", "🎧", "Wired earphones with mic."],
    ["Extension Board", "Havells", 650, 15, 18, 10, "box", "#f4f4f4", "🔌", "4-socket surge protected."],
    ["Power Bank 10000", "Mi", 1299, 20, 18, 4, "box", "#2c3e50", "🔋", "10000 mAh fast charge."],
  ],
  bakery: [
    ["Brown Bread", "Modern", 50, 0, 0, 30, "box", "#b5651d", "🍞", "Whole wheat sliced bread."],
    ["Butter Croissant", "In-house", 65, 0, 5, 15, "round", "#e1a95f", "🥐", "Freshly baked every morning."],
    ["Chocolate Muffin", "In-house", 45, 0, 5, 20, "round", "#5d4037", "🧁", "Rich double chocolate muffin."],
    ["Rusk 300 g", "Britannia", 60, 5, 5, 40, "box", "#d4a15a", "🍞", "Crunchy toast rusk."],
    ["Plum Cake", "Winkies", 120, 10, 18, 8, "box", "#8b3a3a", "🍰", "Fruit plum cake, 250 g."],
    ["Pav (6 pcs)", "In-house", 35, 0, 0, 25, "box", "#e8c07d", "🍞", "Soft ladi pav."],
  ],
};

export const PRODUCTS: Product[] = Object.entries(RAW).flatMap(([categoryId, rows]) =>
  rows.map((r, i) => ({
    id: `${categoryId}-${i + 1}`,
    name: r[0],
    brand: r[1],
    categoryId,
    mrp: r[2],
    discountPct: r[3],
    gstRate: r[4] / 100,
    stock: r[5],
    shape: r[6],
    color: r[7],
    emoji: r[8],
    description: r[9],
  })),
);

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const LOW_STOCK = 8;
