
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import * as SQLite from 'expo-sqlite';
import {
  initializeDatabase,
  getProducts,
  seedDatabase,
} from '../database';

const mockDatabase = {
  execAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
};

beforeAll(() => {
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(
    mockDatabase
  );
});

beforeEach(() => {
  jest.clearAllMocks();

  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(
    mockDatabase
  );
});

describe('Testes do banco de dados', () => {
  test('1. Deve criar as tabelas do banco de dados', async () => {
    await initializeDatabase();

    expect(mockDatabase.execAsync).toHaveBeenCalled();

    const sql = mockDatabase.execAsync.mock.calls[0][0];

    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS condominio'
    );
    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS mensagem_chat'
    );
  });

  test('2. Deve consultar os produtos ativos', async () => {
    const produtos = [
      {
        id: 1,
        titulo: 'Misto Quente',
        descricao: 'Misto quente artesanal',
        preco: 29.5,
        foto_url: null,
      },
      {
        id: 2,
        titulo: 'Hamburguer Duplo',
        descricao: 'Hamburguer artesanal',
        preco: 39.9,
        foto_url: null,
      },
    ];

    mockDatabase.getAllAsync.mockResolvedValue(produtos);

    const resultado = await getProducts();

    expect(resultado).toEqual(produtos);
    expect(mockDatabase.getAllAsync).toHaveBeenCalled();

    const sql = mockDatabase.getAllAsync.mock.calls[0][0];

   expect(sql).toContain("WHERE produto.status = 'ATIVO'");
expect(sql).toContain('ORDER BY produto.id');
  });

  
test('3. Deve verificar os dados antes de evitar duplicações', async () => {
  mockDatabase.getFirstAsync
    .mockResolvedValueOnce({ id: 1 }) // condomínio
    .mockResolvedValueOnce({ id: 1 }); // vendedor

  mockDatabase.getAllAsync.mockResolvedValue([
    { id: 1, titulo: 'Misto Quente', status: 'ATIVO' },
  ]);

  await seedDatabase();

  expect(mockDatabase.getFirstAsync).toHaveBeenCalled();
  expect(mockDatabase.runAsync).toHaveBeenCalled();

  const comandos = mockDatabase.runAsync.mock.calls.map(
    (call) => call[0] as string
  );

  expect(
    comandos.every((sql) => sql.includes('WHERE NOT EXISTS'))
  ).toBe(true);
});
});