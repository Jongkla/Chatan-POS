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
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function getProducts():Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
}

export async function addProduct(product: Omit<Product, 'id'>) {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function submitTransaction(employeeId: string, items: CartItem[], total: number) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price })),
      total
    })
  });
  return res.json();
}

export async function getDailyReport() {
  const res = await fetch(`${API_URL}/reports/daily`);
  return res.json();
}

export async function getUsers():Promise<User[]> {
  const res = await fetch(`${API_URL}/users`);
  return res.json();
}

export async function createUser(user: Partial<User> & {password: string}) {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}
