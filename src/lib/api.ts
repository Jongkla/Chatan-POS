import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp, addDoc, query, where, getDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// Types
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  barcode?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

const API_URL = '/api';

export async function login(username: string, password: string):Promise<{user: User}> {
  // Keeping fallback for simple local behavior, or use Firebase
  // If we change this, we must configure google login. For now since they use username/password,
  // we will query firestore by username. But wait, firestore is secure, so we can't write insecure rules.
  // We'll actually mock this since we don't have proper username/pw in firebase.
  throw new Error("Local auth disabled. Please use Google Login.");
}

export async function getProducts():Promise<Product[]> {
  const querySnapshot = await getDocs(collection(db, "products"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function addProduct(product: Omit<Product, 'id'>) {
  const newRef = doc(collection(db, "products"));
  await setDoc(newRef, {
    ...product,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return { id: newRef.id, ...product };
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, "products", id));
  return { success: true };
}

export async function submitTransaction(employeeId: string, items: CartItem[], total: number) {
  const newRef = doc(collection(db, "transactions"));
  await setDoc(newRef, {
    employeeId,
    total,
    items: items.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price, name: i.name })),
    createdAt: Date.now()
  });
  return { id: newRef.id };
}

export async function getDailyReport() {
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  
  const q = query(collection(db, "transactions"), where("createdAt", ">=", startOfDay.getTime()));
  const querySnapshot = await getDocs(q);
  const transactions = querySnapshot.docs.map(d => d.data());
  
  let totalRevenue = 0;
  let totalItems = 0;
  transactions.forEach(t => {
    totalRevenue += t.total;
    totalItems += t.items.reduce((s:number, i:any) => s + i.quantity, 0);
  });
  
  return {
    date: startOfDay.toISOString().split('T')[0],
    totalRevenue,
    totalTransactions: transactions.length,
    totalItemsSold: totalItems
  };
}

export async function getUsers():Promise<User[]> {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function createUser(user: Partial<User>) {
  const newRef = doc(collection(db, "users"));
  await setDoc(newRef, {
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return { id: newRef.id, ...user };
}

export async function deleteUser(id: string) {
  await deleteDoc(doc(db, "users", id));
  return { success: true };
}

