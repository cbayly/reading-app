export interface Parent {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  parent: Parent;
} 