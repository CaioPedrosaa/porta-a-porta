import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('porta_a_porta.db');
  }

  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS condominio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      endereco TEXT
    );

    CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      bloco_unidade TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      tipo_usuario TEXT NOT NULL DEFAULT 'COMPRADOR',
      FOREIGN KEY (condominio_id) REFERENCES condominio(id)
    );

    CREATE TABLE IF NOT EXISTS produto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor_id INTEGER NOT NULL,
      condominio_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      preco REAL NOT NULL,
      foto_url TEXT,
      status TEXT NOT NULL DEFAULT 'ATIVO',
      FOREIGN KEY (vendedor_id) REFERENCES usuario(id),
      FOREIGN KEY (condominio_id) REFERENCES condominio(id)
    );

    CREATE TABLE IF NOT EXISTS pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL,
      comprador_id INTEGER NOT NULL,
      janela_horario TEXT NOT NULL,
      status_entrega TEXT NOT NULL DEFAULT 'PENDENTE',
      data_pedido TEXT NOT NULL,
      FOREIGN KEY (condominio_id) REFERENCES condominio(id),
      FOREIGN KEY (comprador_id) REFERENCES usuario(id)
    );

    CREATE TABLE IF NOT EXISTS item_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedido(id),
      FOREIGN KEY (produto_id) REFERENCES produto(id)
    );

    CREATE TABLE IF NOT EXISTS avaliacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      comprador_id INTEGER NOT NULL,
      vendedor_id INTEGER NOT NULL,
      nota INTEGER NOT NULL,
      comentario TEXT,
      data_avaliacao TEXT NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedido(id),
      FOREIGN KEY (comprador_id) REFERENCES usuario(id),
      FOREIGN KEY (vendedor_id) REFERENCES usuario(id)
    );

    CREATE TABLE IF NOT EXISTS conversa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ATIVA',
      FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    );

    CREATE TABLE IF NOT EXISTS mensagem_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      remetente_id INTEGER NOT NULL,
      texto_mensagem TEXT NOT NULL,
      data_envio TEXT NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedido(id),
      FOREIGN KEY (remetente_id) REFERENCES usuario(id)
    );
  `);
}

export async function seedDatabase(): Promise<void> {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM produto'
  );

  if (result && result.count > 0) {
    return;
  }

  await database.runAsync(
    `INSERT INTO condominio (nome, endereco)
     VALUES (?, ?)`,
    'Condomínio Porta a Porta',
    'Brasília - DF'
  );

  const condominio = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM condominio ORDER BY id DESC LIMIT 1'
  );

  if (!condominio) {
    return;
  }

  await database.runAsync(
    `INSERT INTO usuario
     (condominio_id, nome, bloco_unidade, email, senha, tipo_usuario)
     VALUES (?, ?, ?, ?, ?, ?)`,
    condominio.id,
    'Roberta',
    'Bloco A - 101',
    'roberta@email.com',
    '123456',
    'VENDEDOR'
  );

  const vendedor = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM usuario WHERE email = ?',
    'roberta@email.com'
  );

  if (!vendedor) {
    return;
  }

  await database.runAsync(
    `INSERT INTO produto
     (vendedor_id, condominio_id, titulo, descricao, preco, foto_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    vendedor.id,
    condominio.id,
    'Misto Quente',
    'Misto quente artesanal',
    29.5,
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600'
  );

  await database.runAsync(
    `INSERT INTO produto
     (vendedor_id, condominio_id, titulo, descricao, preco, foto_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    vendedor.id,
    condominio.id,
    'Hamburguer Duplo',
    'Hamburguer artesanal',
    39.9,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600'
  );

  console.log('Produtos iniciais inseridos no SQLite!');
}

export async function getProducts() {
  const database = await getDatabase();

  return await database.getAllAsync<{
    id: number;
    titulo: string;
    descricao: string | null;
    preco: number;
    foto_url: string | null;
  }>(
    `SELECT id, titulo, descricao, preco, foto_url
     FROM produto
     WHERE status = 'ATIVO'
     ORDER BY id`
  );
}