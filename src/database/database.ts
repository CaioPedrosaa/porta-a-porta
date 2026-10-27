
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
      tipo_usuario TEXT NOT NULL DEFAULT 'AMBOS'
        CHECK (tipo_usuario IN ('COMPRADOR', 'VENDEDOR', 'AMBOS')),
      FOREIGN KEY (condominio_id) REFERENCES condominio(id)
    );

    CREATE TABLE IF NOT EXISTS produto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor_id INTEGER NOT NULL,
      condominio_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      preco REAL NOT NULL CHECK (preco >= 0),
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
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      preco_unitario REAL NOT NULL CHECK (preco_unitario >= 0),
      FOREIGN KEY (pedido_id) REFERENCES pedido(id),
      FOREIGN KEY (produto_id) REFERENCES produto(id)
    );

    CREATE TABLE IF NOT EXISTS avaliacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      comprador_id INTEGER NOT NULL,
      vendedor_id INTEGER NOT NULL,
      nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
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

  // 1. Criar o condomínio de demonstração, se necessário.
  await database.runAsync(
    `INSERT INTO condominio (nome, endereco)
     SELECT ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM condominio WHERE nome = ?
     )`,
    'Condomínio Porta a Porta',
    'Brasília - DF',
    'Condomínio Porta a Porta'
  );

  const condominio = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM condominio
     WHERE nome = ?
     LIMIT 1`,
    'Condomínio Porta a Porta'
  );

  if (!condominio) {
    throw new Error('Não foi possível criar o condomínio de demonstração.');
  }

  // 2. Criar os usuários sem duplicar e-mails existentes.
  await database.runAsync(
    `INSERT INTO usuario
      (condominio_id, nome, bloco_unidade, email, senha, tipo_usuario)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM usuario WHERE email = ?
     )`,
    condominio.id,
    'Roberta',
    'Bloco A - 101',
    'roberta@email.com',
    '123456',
    'AMBOS',
    'roberta@email.com'
  );

  await database.runAsync(
    `INSERT INTO usuario
      (condominio_id, nome, bloco_unidade, email, senha, tipo_usuario)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM usuario WHERE email = ?
     )`,
    condominio.id,
    'Caio Matos',
    'Bloco A - 101',
    'caio@email.com',
    '123456',
    'AMBOS',
    'caio@email.com'
  );

  const vendedor = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM usuario WHERE email = ?`,
    'roberta@email.com'
  );

  if (!vendedor) {
    throw new Error('Não foi possível localizar a vendedora de demonstração.');
  }

  // 3. Inserir os produtos de demonstração, se ainda não existirem.
  const produtos = [
    {
      titulo: 'Misto Quente',
      descricao: 'Misto quente artesanal',
      preco: 29.5,
      foto: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    },
    {
      titulo: 'Hamburguer Duplo',
      descricao: 'Hambúrguer artesanal',
      preco: 39.9,
      foto: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    },
    {
      titulo: 'Bolo de Chocolate',
      descricao: 'Bolo de chocolate caseiro',
      preco: 25,
      foto: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
    },
    {
      titulo: 'Suco Natural 1L',
      descricao: 'Suco natural de frutas',
      preco: 12,
      foto: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600',
    },
  ];

  for (const produto of produtos) {
    await database.runAsync(
      `INSERT INTO produto
        (vendedor_id, condominio_id, titulo, descricao, preco, foto_url)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM produto
         WHERE vendedor_id = ? AND titulo = ?
       )`,
      vendedor.id,
      condominio.id,
      produto.titulo,
      produto.descricao,
      produto.preco,
      produto.foto,
      vendedor.id,
      produto.titulo
    );
  }

  const produtosNoBanco = await database.getAllAsync<{
    id: number;
    titulo: string;
    status: string;
  }>(
    `SELECT id, titulo, status FROM produto ORDER BY id`
  );

  console.log('DIAGNÓSTICO DOS PRODUTOS:', produtosNoBanco);
}

export async function getProducts() {
  const database = await getDatabase();

  return database.getAllAsync<{
    id: number;
    titulo: string;
    descricao: string | null;
    preco: number;
    foto_url: string | null;
    vendedor_id: number;
    nome_vendedor: string;
  }>(
    `SELECT
       produto.id,
       produto.titulo,
       produto.descricao,
       produto.preco,
       produto.foto_url,
       produto.vendedor_id,
       usuario.nome AS nome_vendedor
     FROM produto
     INNER JOIN usuario ON usuario.id = produto.vendedor_id
     WHERE produto.status = 'ATIVO'
     ORDER BY produto.id`
  );
}


export async function createOrder(params: {
  compradorId: number;
  condominioId: number;
  janelaHorario: string;
  itens: {
    produtoId: number;
    quantidade: number;
    precoUnitario: number;
  }[];
}): Promise<number> {
  const database = await getDatabase();

  if (params.itens.length === 0) {
    throw new Error('O pedido precisa ter pelo menos um produto.');
  }

  let pedidoId = 0;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `INSERT INTO pedido
        (condominio_id, comprador_id, janela_horario, status_entrega, data_pedido)
       VALUES (?, ?, ?, ?, ?)`,
      params.condominioId,
      params.compradorId,
      params.janelaHorario,
      'PENDENTE',
      new Date().toISOString()
    );

    pedidoId = result.lastInsertRowId;

    for (const item of params.itens) {
      await database.runAsync(
        `INSERT INTO item_pedido
          (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?)`,
        pedidoId,
        item.produtoId,
        item.quantidade,
        item.precoUnitario
      );
    }
  });

  return pedidoId;
}


export async function getDemoOrderIds(): Promise<{
  compradorId: number;
  condominioId: number;
}> {
  const database = await getDatabase();

  const comprador = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM usuario WHERE email = ?',
    'caio@email.com'
  );

  const condominio = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM condominio WHERE nome = ?',
    'Condomínio Porta a Porta'
  );

  if (!comprador || !condominio) {
    throw new Error('Comprador ou condomínio não encontrado no banco de dados.');
  }

  return {
    compradorId: comprador.id,
    condominioId: condominio.id,
  };
}
export async function getOrders(compradorId: number): Promise<{
  id: number;
  seller: string;
  product: string;
  price: number;
  image: string;
  status: string;
}[]> {
  const database = await getDatabase();

  const orders = await database.getAllAsync<{
    id: number;
    seller: string;
    product: string;
    price: number;
    image: string | null;
    status: string;
  }>(
    `SELECT
       pedido.id AS id,
       COALESCE(MIN(usuario.nome), 'Vendedor') AS seller,
       GROUP_CONCAT(produto.titulo, ' + ') AS product,
       SUM(item_pedido.quantidade * item_pedido.preco_unitario) AS price,
       MIN(produto.foto_url) AS image,
       pedido.status_entrega AS status
     FROM pedido
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     INNER JOIN usuario
       ON usuario.id = produto.vendedor_id
     WHERE pedido.comprador_id = ?
     GROUP BY pedido.id
     ORDER BY pedido.id DESC`,
    compradorId
  );

  return orders.map((order) => ({
    ...order,
    image: order.image ?? '',
    status:
      order.status === 'PENDENTE'
        ? 'Pedido Pendente'
        : order.status,
  }));
}


export async function updateOrderStatus(
  pedidoId: number,
  vendedorId: number,
  status: string
): Promise<void> {
  const database = await getDatabase();

  const statusPermitidos = [
    'ACEITO',
    'EM_PREPARO',
    'A_CAMINHO',
    'FINALIZADO',
  ];

  if (!statusPermitidos.includes(status)) {
    throw new Error('Status do pedido inválido.');
  }

  const result = await database.runAsync(
    `UPDATE pedido
     SET status_entrega = ?
     WHERE id = ?
       AND EXISTS (
         SELECT 1
         FROM item_pedido
         INNER JOIN produto
           ON produto.id = item_pedido.produto_id
         WHERE item_pedido.pedido_id = pedido.id
           AND produto.vendedor_id = ?
       )`,
    status,
    pedidoId,
    vendedorId
  );

  if (result.changes === 0) {
    throw new Error(
      'Pedido não encontrado ou você não tem permissão para atualizá-lo.'
    );
  }
}

export async function checkDatabaseTables(): Promise<string[]> {
  const database = await getDatabase();

  const tables = await database.getAllAsync<{ name: string }>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  );

  return tables.map((table) => table.name);
}


export async function checkDatabaseRelationships(): Promise<
  Record<string, { from: string; table: string; to: string }[]>
> {
  const database = await getDatabase();

  const tables = [
    'usuario',
    'produto',
    'pedido',
    'item_pedido',
    'avaliacao',
    'conversa',
    'mensagem_chat',
  ];

  const relationships: Record<
    string,
    { from: string; table: string; to: string }[]
  > = {};

  for (const table of tables) {
    const rows = await database.getAllAsync<{
      from: string;
      table: string;
      to: string;
    }>(`PRAGMA foreign_key_list("${table}")`);

    relationships[table] = rows;
  }

  return relationships;
}

export async function createProduct(params: {
  vendedorId: number;
  condominioId: number;
  titulo: string;
  descricao: string;
  preco: number;
  fotoUrl?: string;
}): Promise<number> {
  const database = await getDatabase();

  if (!params.titulo.trim()) {
    throw new Error('O nome do produto é obrigatório.');
  }

  if (params.preco < 0) {
    throw new Error('O preço não pode ser negativo.');
  }

  const result = await database.runAsync(
    `INSERT INTO produto (
      vendedor_id,
      condominio_id,
      titulo,
      descricao,
      preco,
      foto_url,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params.vendedorId,
    params.condominioId,
    params.titulo.trim(),
    params.descricao.trim(),
    params.preco,
    params.fotoUrl ?? null,
    'ATIVO'
  );

  return result.lastInsertRowId;
}

export async function getProductsBySeller(vendedorId: number) {
  const database = await getDatabase();

  return database.getAllAsync<{
    id: number;
    titulo: string;
    descricao: string | null;
    preco: number;
    foto_url: string | null;
    status: string;
    condominio_id: number;
  }>(
    `SELECT
       id,
       titulo,
       descricao,
       preco,
       foto_url,
       status,
       condominio_id
     FROM produto
     WHERE vendedor_id = ?
     ORDER BY id DESC`,
    vendedorId
  );
}

export async function updateProduct(params: {
  produtoId: number;
  vendedorId: number;
  titulo: string;
  descricao: string;
  preco: number;
  fotoUrl?: string;
}): Promise<void> {
  const database = await getDatabase();

  if (!params.titulo.trim()) {
    throw new Error('O nome do produto é obrigatório.');
  }

  if (!Number.isFinite(params.preco) || params.preco < 0) {
    throw new Error('Informe um preço válido.');
  }

  const result = await database.runAsync(
    `UPDATE produto
     SET titulo = ?,
         descricao = ?,
         preco = ?,
         foto_url = ?
     WHERE id = ?
       AND vendedor_id = ?`,
    params.titulo.trim(),
    params.descricao.trim(),
    params.preco,
    params.fotoUrl ?? null,
    params.produtoId,
    params.vendedorId
  );

  if (result.changes === 0) {
    throw new Error(
      'Produto não encontrado ou você não tem permissão para editá-lo.'
    );
  }
}

export async function deactivateProduct(
  produtoId: number,
  vendedorId: number
): Promise<void> {
  const database = await getDatabase();

  const result = await database.runAsync(
    `UPDATE produto
     SET status = 'INATIVO'
     WHERE id = ?
       AND vendedor_id = ?
       AND status = 'ATIVO'`,
    produtoId,
    vendedorId
  );

  if (result.changes === 0) {
    throw new Error(
      'Produto não encontrado, já desativado ou você não tem permissão para desativá-lo.'
    );
  }
}


export async function reactivateProduct(
  produtoId: number,
  vendedorId: number
): Promise<void> {
  const database = await getDatabase();

  const result = await database.runAsync(
    `UPDATE produto
     SET status = 'ATIVO'
     WHERE id = ?
       AND vendedor_id = ?
       AND status = 'INATIVO'`,
    produtoId,
    vendedorId
  );

  if (result.changes === 0) {
    throw new Error(
      'Produto não encontrado, já ativo ou você não tem permissão para reativá-lo.'
    );
  }
}


export async function getOrdersBySeller(vendedorId: number) {
  const database = await getDatabase();

  return database.getAllAsync<{
    id: number;
    comprador_id: number;
    nome_comprador: string;
    bloco_unidade: string;
    data_pedido: string;
    status_entrega: string;
    total: number;
    produtos: string;
  }>(
    `SELECT
       pedido.id AS id,
       pedido.comprador_id AS comprador_id,
       usuario.nome AS nome_comprador,
       usuario.bloco_unidade AS bloco_unidade,
       pedido.data_pedido AS data_pedido,
       pedido.status_entrega AS status_entrega,
       SUM(item_pedido.quantidade * item_pedido.preco_unitario) AS total,
       GROUP_CONCAT(produto.titulo, ' + ') AS produtos
     FROM pedido
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     INNER JOIN usuario
       ON usuario.id = pedido.comprador_id
     WHERE produto.vendedor_id = ?
     GROUP BY pedido.id
     ORDER BY pedido.id DESC`,
    vendedorId
  );
}



export async function createReview(params: {
  pedidoId: number;
  compradorId: number;
  vendedorId: number;
  nota: number;
  comentario?: string;
}): Promise<void> {
  const database = await getDatabase();

  if (!Number.isInteger(params.nota) || params.nota < 1 || params.nota > 5) {
    throw new Error('A nota deve ser um número inteiro entre 1 e 5.');
  }

  if (params.comentario && params.comentario.length > 500) {
    throw new Error('O comentário deve ter no máximo 500 caracteres.');
  }

  const pedido = await database.getFirstAsync<{
    id: number;
    comprador_id: number;
    status_entrega: string;
  }>(
    `SELECT id, comprador_id, status_entrega
     FROM pedido
     WHERE id = ?`,
    params.pedidoId
  );

  if (!pedido || pedido.comprador_id !== params.compradorId) {
    throw new Error(
      'Pedido não encontrado ou você não tem permissão para avaliá-lo.'
    );
  }

  if (pedido.status_entrega !== 'FINALIZADO') {
    throw new Error('Só é possível avaliar um pedido finalizado.');
  }

  const vendedorDoPedido = await database.getFirstAsync<{ id: number }>(
    `SELECT produto.vendedor_id AS id
     FROM item_pedido
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     WHERE item_pedido.pedido_id = ?
       AND produto.vendedor_id = ?
     LIMIT 1`,
    params.pedidoId,
    params.vendedorId
  );

  if (!vendedorDoPedido) {
    throw new Error('Esse vendedor não possui produtos nesse pedido.');
  }

  const avaliacaoExistente = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM avaliacao
     WHERE pedido_id = ?
       AND comprador_id = ?
       AND vendedor_id = ?`,
    params.pedidoId,
    params.compradorId,
    params.vendedorId
  );

  if (avaliacaoExistente) {
    throw new Error('Você já avaliou esse vendedor neste pedido.');
  }

  await database.runAsync(
    `INSERT INTO avaliacao (
      pedido_id,
      comprador_id,
      vendedor_id,
      nota,
      comentario,
      data_avaliacao
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    params.pedidoId,
    params.compradorId,
    params.vendedorId,
    params.nota,
    params.comentario?.trim() || null,
    new Date().toISOString()
  );
}

export async function getReviewsBySeller(vendedorId: number) {
  const database = await getDatabase();

  return database.getAllAsync<{
    id: number;
    pedido_id: number;
    comprador_id: number;
    nome_comprador: string;
    nota: number;
    comentario: string | null;
    data_avaliacao: string;
  }>(
    `SELECT
       avaliacao.id,
       avaliacao.pedido_id,
       avaliacao.comprador_id,
       usuario.nome AS nome_comprador,
       avaliacao.nota,
       avaliacao.comentario,
       avaliacao.data_avaliacao
     FROM avaliacao
     INNER JOIN usuario
       ON usuario.id = avaliacao.comprador_id
     WHERE avaliacao.vendedor_id = ?
     ORDER BY avaliacao.id DESC`,
    vendedorId
  );
}


export async function getSellerRating(vendedorId: number): Promise<{
  media: number;
  totalAvaliacoes: number;
}> {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{
    media: number | null;
    totalAvaliacoes: number;
  }>(
    `SELECT
       ROUND(AVG(nota), 1) AS media,
       COUNT(*) AS totalAvaliacoes
     FROM avaliacao
     WHERE vendedor_id = ?`,
    vendedorId
  );

  return {
    media: result?.media ?? 0,
    totalAvaliacoes: result?.totalAvaliacoes ?? 0,
  };
}


export async function getOrderDetails(pedidoId: number) {
  const database = await getDatabase();

  return database.getAllAsync<{
    produto_id: number;
    titulo: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    vendedor_id: number;
    nome_vendedor: string;
  }>(
    `SELECT
       produto.id AS produto_id,
       produto.titulo AS titulo,
       item_pedido.quantidade AS quantidade,
       item_pedido.preco_unitario AS preco_unitario,
       item_pedido.quantidade * item_pedido.preco_unitario AS subtotal,
       produto.vendedor_id AS vendedor_id,
       usuario.nome AS nome_vendedor
     FROM item_pedido
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     INNER JOIN usuario
       ON usuario.id = produto.vendedor_id
     WHERE item_pedido.pedido_id = ?
     ORDER BY item_pedido.id ASC`,
    pedidoId
  );
}


export async function getOrderDetailsForBuyer(
  pedidoId: number,
  compradorId: number
) {
  const database = await getDatabase();

  const pedido = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM pedido
     WHERE id = ?
       AND comprador_id = ?`,
    pedidoId,
    compradorId
  );

  if (!pedido) {
    throw new Error(
      'Pedido não encontrado ou você não tem permissão para visualizá-lo.'
    );
  }

  return getOrderDetails(pedidoId);
}



export async function getSellerSalesSummary(vendedorId: number): Promise<{
  totalPedidos: number;
  faturamentoTotal: number;
}> {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{
    totalPedidos: number;
    faturamentoTotal: number;
  }>(
    `SELECT
       COUNT(DISTINCT pedido.id) AS totalPedidos,
       COALESCE(
         SUM(item_pedido.quantidade * item_pedido.preco_unitario),
         0
       ) AS faturamentoTotal
     FROM pedido
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     WHERE produto.vendedor_id = ?
       AND pedido.status_entrega != 'CANCELADO'`,
    vendedorId
  );

  return {
    totalPedidos: result?.totalPedidos ?? 0,
    faturamentoTotal: result?.faturamentoTotal ?? 0,
  };
}

export async function getSellerSalesByPeriod(
  vendedorId: number,
  inicio: string,
  fim: string
): Promise<{
  totalPedidos: number;
  faturamentoTotal: number;
}> {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{
    totalPedidos: number;
    faturamentoTotal: number;
  }>(
    `SELECT
       COUNT(DISTINCT pedido.id) AS totalPedidos,
       COALESCE(
         SUM(item_pedido.quantidade * item_pedido.preco_unitario),
         0
       ) AS faturamentoTotal
     FROM pedido
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     WHERE produto.vendedor_id = ?
       AND pedido.status_entrega = 'FINALIZADO'
       AND pedido.data_pedido >= ?
       AND pedido.data_pedido < ?`,
    vendedorId,
    inicio,
    fim
  );

  return {
    totalPedidos: result?.totalPedidos ?? 0,
    faturamentoTotal: result?.faturamentoTotal ?? 0,
  };
}


export async function getSellerOrdersByStatus(
  vendedorId: number,
  status: string
) {
  const database = await getDatabase();

  const statusPermitidos = [
    'PENDENTE',
    'ACEITO',
    'EM_PREPARO',
    'A_CAMINHO',
    'FINALIZADO',
  ];

  if (!statusPermitidos.includes(status)) {
    throw new Error('Status do pedido inválido.');
  }

  return database.getAllAsync<{
    id: number;
    comprador_id: number;
    nome_comprador: string;
    bloco_unidade: string;
    data_pedido: string;
    status_entrega: string;
    total: number;
    produtos: string;
  }>(
    `SELECT
       pedido.id AS id,
       pedido.comprador_id AS comprador_id,
       usuario.nome AS nome_comprador,
       usuario.bloco_unidade AS bloco_unidade,
       pedido.data_pedido AS data_pedido,
       pedido.status_entrega AS status_entrega,
       SUM(item_pedido.quantidade * item_pedido.preco_unitario) AS total,
       GROUP_CONCAT(produto.titulo, ' + ') AS produtos
     FROM pedido
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     INNER JOIN usuario
       ON usuario.id = pedido.comprador_id
     WHERE produto.vendedor_id = ?
       AND pedido.status_entrega = ?
     GROUP BY pedido.id
     ORDER BY pedido.id DESC`,
    vendedorId,
    status
  );
}

export async function createConversation(pedidoId: number): Promise<number> {
  const database = await getDatabase();

  const pedido = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM pedido
     WHERE id = ?`,
    pedidoId
  );

  if (!pedido) {
    throw new Error('Pedido não encontrado.');
  }

  const conversaExistente = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM conversa
     WHERE pedido_id = ?`,
    pedidoId
  );

  if (conversaExistente) {
    return conversaExistente.id;
  }

  const result = await database.runAsync(
    `INSERT INTO conversa (pedido_id, status)
     VALUES (?, ?)`,
    pedidoId,
    'ATIVA'
  );

  return result.lastInsertRowId;
}


export async function sendMessage(params: {
  pedidoId: number;
  remetenteId: number;
  texto: string;
}): Promise<number> {
  const database = await getDatabase();

  const texto = params.texto.trim();

  if (!texto) {
    throw new Error('A mensagem não pode estar vazia.');
  }

  if (texto.length > 2000) {
    throw new Error('A mensagem deve ter no máximo 2000 caracteres.');
  }

  const pedido = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM pedido
     WHERE id = ?
       AND (
         comprador_id = ?
         OR EXISTS (
           SELECT 1
           FROM item_pedido
           INNER JOIN produto
             ON produto.id = item_pedido.produto_id
           WHERE item_pedido.pedido_id = pedido.id
             AND produto.vendedor_id = ?
         )
       )`,
    params.pedidoId,
    params.remetenteId,
    params.remetenteId
  );

  if (!pedido) {
    throw new Error(
      'Pedido não encontrado ou você não tem permissão para enviar mensagens.'
    );
  }

  const conversaId = await createConversation(params.pedidoId);

  const conversa = await database.getFirstAsync<{ status: string }>(
    `SELECT status
     FROM conversa
     WHERE id = ?`,
    conversaId
  );

  if (!conversa || conversa.status !== 'ATIVA') {
    throw new Error('Esta conversa está encerrada.');
  }

  const result = await database.runAsync(
    `INSERT INTO mensagem_chat (
      pedido_id,
      remetente_id,
      texto_mensagem,
      data_envio
    ) VALUES (?, ?, ?, ?)`,
    params.pedidoId,
    params.remetenteId,
    texto,
    new Date().toISOString()
  );

  return result.lastInsertRowId;
}


export async function getMessagesByOrder(pedidoId: number) {
  const database = await getDatabase();

  return database.getAllAsync<{
    id: number;
    pedido_id: number;
    remetente_id: number;
    nome_remetente: string;
    texto_mensagem: string;
    data_envio: string;
  }>(
    `SELECT
       mensagem_chat.id,
       mensagem_chat.pedido_id,
       mensagem_chat.remetente_id,
       usuario.nome AS nome_remetente,
       mensagem_chat.texto_mensagem,
       mensagem_chat.data_envio
     FROM mensagem_chat
     INNER JOIN usuario
       ON usuario.id = mensagem_chat.remetente_id
     WHERE mensagem_chat.pedido_id = ?
     ORDER BY mensagem_chat.id ASC`,
    pedidoId
  );
}


export async function updateConversationStatus(
  pedidoId: number,
  status: 'ATIVA' | 'ENCERRADA'
): Promise<void> {
  const database = await getDatabase();

  const conversa = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM conversa
     WHERE pedido_id = ?`,
    pedidoId
  );

  if (!conversa) {
    throw new Error('Conversa não encontrada.');
  }

  await database.runAsync(
    `UPDATE conversa
     SET status = ?
     WHERE pedido_id = ?`,
    status,
    pedidoId
  );
}


export async function getMessagesByOrderForParticipant(
  pedidoId: number,
  usuarioId: number
) {
  const database = await getDatabase();

  const participante = await database.getFirstAsync<{ id: number }>(
    `SELECT pedido.id
     FROM pedido
     WHERE pedido.id = ?
       AND (
         pedido.comprador_id = ?
         OR EXISTS (
           SELECT 1
           FROM item_pedido
           INNER JOIN produto
             ON produto.id = item_pedido.produto_id
           WHERE item_pedido.pedido_id = pedido.id
             AND produto.vendedor_id = ?
         )
       )`,
    pedidoId,
    usuarioId,
    usuarioId
  );

  if (!participante) {
    throw new Error(
      'Você não tem permissão para visualizar as mensagens deste pedido.'
    );
  }

  return getMessagesByOrder(pedidoId);
}


export async function getUserProfile(usuarioId: number) {
  const database = await getDatabase();

  const usuario = await database.getFirstAsync<{
    id: number;
    nome: string;
    email: string;
    bloco_unidade: string;
    tipo_usuario: string;
    condominio_id: number;
    nome_condominio: string;
  }>(
    `SELECT
       usuario.id,
       usuario.nome,
       usuario.email,
       usuario.bloco_unidade,
       usuario.tipo_usuario,
       usuario.condominio_id,
       condominio.nome AS nome_condominio
     FROM usuario
     INNER JOIN condominio
       ON condominio.id = usuario.condominio_id
     WHERE usuario.id = ?`,
    usuarioId
  );

  if (!usuario) {
    throw new Error('Usuário não encontrado.');
  }

  return usuario;
}


export async function getCondominium(condominioId: number) {
  const database = await getDatabase();

  const condominio = await database.getFirstAsync<{
    id: number;
    nome: string;
    endereco: string;
  }>(
    `SELECT
       id,
       nome,
       endereco
     FROM condominio
     WHERE id = ?`,
    condominioId
  );

  if (!condominio) {
    throw new Error('Condomínio não encontrado.');
  }

  return condominio;
}


export async function getDemoSellerId(): Promise<number> {
  const database = await getDatabase();

  const vendedor = await database.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM usuario
     WHERE email = ?`,
    'roberta@email.com'
  );

  if (!vendedor) {
    throw new Error(
      'Vendedor de demonstração não encontrado. Verifique se o banco foi inicializado.'
    );
  }

  return vendedor.id;
}


export async function getSellerRecentSales(
  vendedorId: number,
  limite: number = 5
): Promise<{
  pedidoId: number;
  comprador: string;
  produtos: string;
  total: number;
  dataPedido: string;
  status: string;
  imagem: string | null;
}[]> {
  const database = await getDatabase();

  return await database.getAllAsync<{
    pedidoId: number;
    comprador: string;
    produtos: string;
    total: number;
    dataPedido: string;
    status: string;
    imagem: string | null;
  }>(
    `SELECT
       pedido.id AS pedidoId,
       usuario.nome AS comprador,
       GROUP_CONCAT(produto.titulo, ', ') AS produtos,
       SUM(item_pedido.quantidade * item_pedido.preco_unitario) AS total,
       pedido.data_pedido AS dataPedido,
       pedido.status_entrega AS status,
       MIN(produto.foto_url) AS imagem
     FROM pedido
     INNER JOIN usuario
       ON usuario.id = pedido.comprador_id
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     WHERE produto.vendedor_id = ?
       AND pedido.status_entrega != 'CANCELADO'
     GROUP BY
       pedido.id,
       usuario.nome,
       pedido.data_pedido,
       pedido.status_entrega
     ORDER BY pedido.data_pedido DESC
     LIMIT ?`,
    vendedorId,
    Math.max(1, Math.floor(limite))
  );
}



export async function getSellerMonthlySales(
  vendedorId: number,
  ano: number
): Promise<{ mes: number; faturamento: number }[]> {
  console.log('MENSAL 1: entrando na função');

  const database = await getDatabase();
  console.log('MENSAL 2: banco obtido');

  console.log(
    'MENSAL 3: getAllAsync é função?',
    typeof database.getAllAsync
  );

  const inicio = `${ano}-01-01T03:00:00.000Z`;
  const fim = `${ano + 1}-01-01T03:00:00.000Z`;

  const resultado = await database.getAllAsync<{
    mes: number;
    faturamento: number;
  }>(
    `SELECT
       CAST(strftime('%m', pedido.data_pedido) AS INTEGER) AS mes,
       SUM(item_pedido.quantidade * item_pedido.preco_unitario) AS faturamento
     FROM pedido
     INNER JOIN item_pedido
       ON item_pedido.pedido_id = pedido.id
     INNER JOIN produto
       ON produto.id = item_pedido.produto_id
     WHERE produto.vendedor_id = ?
       AND pedido.status_entrega = 'FINALIZADO'
       AND pedido.data_pedido >= ?
       AND pedido.data_pedido < ?
     GROUP BY strftime('%m', pedido.data_pedido)
     ORDER BY mes`,
    vendedorId,
    inicio,
    fim
  );

  console.log('MENSAL 4: consulta concluída', resultado);

  return resultado;
}
