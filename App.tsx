import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  initializeDatabase,
  seedDatabase,
  getProducts,
  createOrder,
  getDatabase,
  getDemoOrderIds,
  getDemoSellerId,
  getOrders,
  getSellerSalesSummary,
  getSellerSalesByPeriod,
  getSellerRecentSales,
  updateOrderStatus,
  getSellerMonthlySales,
  sendMessage as sendMessageToDatabase,
  getMessagesByOrderForParticipant,
} from './src/database/database';

type Product = { id: number; seller: string; name: string; price: number; image: string };
type Order = { id:number; seller:string; product:string; price:number; image:string; status:string };
type Chat = {
  id: number;
  pedidoId: number;
  name: string;
  preview: string;
  time: string;
};

const fallbackProducts: Order[] = [
  {
    id: 1001,
    seller: 'Padaria da dona Roberta',
    product: 'Misto Quente',
    price: 29.5,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    status: 'Pedido Finalizado'
  },
  {
    id: 1002,
    seller: 'Padaria da dona Roberta',
    product: 'Hamburguer Duplo',
    price: 39.9,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    status: 'Pedido Finalizado'
  }
];


const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

type Screen = 'home'|'orders'|'cart'|'profile'|'sellerProfile'|'sellerDashboard'|'chat'|'conversation';

export default function App(){

  
useEffect(() => {
  async function loadProducts() {
    try {
      await initializeDatabase();
      await seedDatabase();

      const data = await getProducts();

console.log('PRODUTOS NO SQLITE:', data.map(p => p.titulo));

setProducts(
  data.map((p) => ({
    id: p.id,
    seller: p.nome_vendedor,
    name: p.titulo,
    price: p.preco,
    image: p.foto_url ?? '',
  }))
);

await loadOrders();
await loadChats();

console.log('SQLite pronto! Produtos carregados:', data.length);
} catch (error) {
  console.error('Erro ao carregar produtos do SQLite:', error);
}
}

loadProducts();
}, []);


 const [screen,setScreen]=useState<Screen>('orders');
 const [search,setSearch]=useState('');
 const [cart,setCart]=useState<Product[]>([]);
const [orders, setOrders] = useState<Order[]>([]);
 const [message,setMessage]=useState('');
 const [products, setProducts] = useState<Product[]>([]);
 const [recentSales, setRecentSales] = useState<
  Awaited<ReturnType<typeof getSellerRecentSales>>
>([]);
const [salesSummary, setSalesSummary] = useState({
  totalPedidos: 0,
  faturamentoTotal: 0,
});
const [dailyRevenue, setDailyRevenue] = useState(0);
const [monthlyRevenue, setMonthlyRevenue] = useState(0);
const [monthlySales, setMonthlySales] = useState<
  { mes: number; faturamento: number }[]
>([]);
 const filtered = products.filter(p =>
  p.name.toLowerCase().includes(search.toLowerCase())
);
const [selectedChat, setSelectedChat] = useState<any>(null);
type ChatMessage = {
  id: number;
  pedido_id: number;
  remetente_id: number;
  nome_remetente: string;
  texto_mensagem: string;
  data_envio: string;
};

const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
const [currentUserId, setCurrentUserId] = useState<number | null>(null);
const [chats, setChats] = useState<Chat[]>([]);

async function testDatabase() {
  try {
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

    const results: string[] = [];

    for (const table of tables) {
      const rows = await database.getAllAsync<{
        from: string;
        table: string;
        to: string;
      }>(`PRAGMA foreign_key_list("${table}")`);

      results.push(
        `${table}: ${
          rows.length
            ? rows.map((r) => `${r.from} → ${r.table}.${r.to}`).join(', ')
            : 'sem chaves estrangeiras'
        }`
      );
    }

    console.log('RELACIONAMENTOS:', results);

    Alert.alert('Relacionamentos do banco', results.join('\n\n'));
  } catch (error) {
    console.error('Erro ao verificar relacionamentos:', error);

    Alert.alert(
      'Erro',
      error instanceof Error ? error.message : String(error)
    );
  }
}
async function loadOrders() {
  try {
    const ids = await getDemoOrderIds();
    const pedidos = await getOrders(ids.compradorId);

    setOrders(pedidos);
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error);
    Alert.alert('Erro', 'Não foi possível carregar os pedidos.');
  }
}


async function loadChats() {
  try {
    const ids = await getDemoOrderIds();
    const pedidos = await getOrders(ids.compradorId);

    const conversas = await Promise.all(
      pedidos.map(async (pedido) => {
        const mensagens = await getMessagesByOrderForParticipant(
          pedido.id,
          ids.compradorId
        );

        const ultimaMensagem = mensagens[mensagens.length - 1];

        return {
          id: pedido.id,
          pedidoId: pedido.id,
          name: pedido.seller,
          preview: ultimaMensagem
            ? ultimaMensagem.texto_mensagem
            : pedido.product,
          time: ultimaMensagem
            ? new Date(ultimaMensagem.data_envio).toLocaleTimeString(
                'pt-BR',
                { hour: '2-digit', minute: '2-digit' }
              )
            : '',
        };
      })
    );

    setChats(conversas);
  } catch (error) {
    console.error('Erro ao carregar conversas:', error);
    Alert.alert('Erro', 'Não foi possível carregar as conversas.');
  }
}

async function loadConversation(chat: Chat) {
  try {
    const ids = await getDemoOrderIds();

    const mensagens = await getMessagesByOrderForParticipant(
      chat.pedidoId,
      ids.compradorId
    );

    setCurrentUserId(ids.compradorId);
    setChatMessages(mensagens);
    setSelectedChat(chat);
    setScreen('conversation');
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
    Alert.alert('Erro', 'Não foi possível carregar as mensagens.');
  }
}

async function loadSellerSummary() {
  
try {
  console.log('ETAPA 1: buscando vendedor');
  const vendedorId = await getDemoSellerId();
  try {
  const testeMensal = await getSellerMonthlySales(
    vendedorId,
    new Date().getFullYear()
  );
  console.log('TESTE MENSAL OK:', testeMensal);
} catch (erro) {
  console.log('ERRO TESTE MENSAL:', erro);
}

  console.log('ETAPA 1 OK:', vendedorId);

const anoAtual = new Date().getFullYear();
const monthlyData = await getSellerMonthlySales(vendedorId, anoAtual);
setMonthlySales(monthlyData);
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setUTCHours(3, 0, 0, 0);

  if (startOfDay.getTime() > now.getTime()) {
    startOfDay.setUTCDate(startOfDay.getUTCDate() - 1);
  }

  const endOfDay = new Date(
    startOfDay.getTime() + 24 * 60 * 60 * 1000
  );


    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    const startOfMonth = new Date(
      Date.UTC(year, month, 1, 3, 0, 0, 0)
    );

    const endOfMonth = new Date(
      Date.UTC(year, month + 1, 1, 3, 0, 0, 0)
    );

    console.log('ETAPA 2: buscando resumo');
    const summary = await getSellerSalesSummary(vendedorId);
    console.log('ETAPA 2 OK:', summary);

    console.log('ETAPA 3: buscando receita diária');
    const daily = await getSellerSalesByPeriod(
      vendedorId,
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
    console.log('ETAPA 3 OK:', daily);

    console.log('ETAPA 4: buscando receita mensal');
    const monthly = await getSellerSalesByPeriod(
      vendedorId,
      startOfMonth.toISOString(),
      endOfMonth.toISOString()
    );
    console.log('ETAPA 4 OK:', monthly);

    setSalesSummary(summary);
setDailyRevenue(daily.faturamentoTotal);
setMonthlyRevenue(monthly.faturamentoTotal);

const sales = await getSellerRecentSales(vendedorId, 5);
setRecentSales(sales);
  } catch (error) {
    console.error('ERRO NO DASHBOARD:', error);
    Alert.alert(
      'Erro no dashboard',
      error instanceof Error ? error.message : String(error)
    );
  }
}

function add(p:Product){
  setCart(c=>[...c,p]);
  Alert.alert('Produto adicionado',`${p.name} foi adicionado ao carrinho.`);
 }

 
async function checkout() {
  if (!cart.length) {
    Alert.alert('Carrinho vazio', 'Adicione um produto antes de finalizar.');
    return;
  }

  try {
    const ids = await getDemoOrderIds();

    const pedidoId = await createOrder({
      compradorId: ids.compradorId,
      condominioId: ids.condominioId,
      janelaHorario: 'A combinar',
      itens: cart.map((p) => ({
        produtoId: p.id,
        quantidade: 1,
        precoUnitario: p.price,
      })),
    });

    const p = cart[0];
    const total = cart.reduce((s, x) => s + x.price, 0);

    setOrders((o) => [
      {
        id: pedidoId,
        seller: p.seller,
        product:
          cart.length > 1
            ? `${p.name} + ${cart.length - 1} item(ns)`
            : p.name,
        price: total,
        image: p.image,
        status: 'Pedido Pendente',
      },
      ...o,
    ]);

    setCart([]);
    setScreen('orders');

    Alert.alert(
      'Pedido realizado',
      `Pedido #${pedidoId} salvo com sucesso no banco de dados.`
    );
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    Alert.alert(
      'Erro',
      'Não foi possível salvar o pedido. Confira o terminal.'
    );
  }
}


async function advance(id: number) {
  try {
    const order = orders.find((item) => item.id === id);

    if (!order) {
      throw new Error('Pedido não encontrado.');
    }

    let nextStatus: string;
    let databaseStatus: string;

    if (order.status === 'Pedido Pendente') {
      nextStatus = 'Pedido Aceito';
      databaseStatus = 'ACEITO';
    } else if (order.status === 'Pedido Aceito') {
      nextStatus = 'Em preparo';
      databaseStatus = 'EM_PREPARO';
    } else if (order.status === 'Em preparo') {
      nextStatus = 'A caminho';
      databaseStatus = 'A_CAMINHO';
    } else {
      nextStatus = 'Pedido Finalizado';
      databaseStatus = 'FINALIZADO';
    }

    const vendedorId = await getDemoSellerId();

    await updateOrderStatus(id, vendedorId, databaseStatus);
    await loadOrders();
    await loadSellerSummary(); 

    Alert.alert('Sucesso', `Status atualizado para: ${nextStatus}`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível atualizar o pedido.';

    Alert.alert('Erro', message);
  }
}



async function handleSendMessage() {
  if (!message.trim() || !selectedChat) return;

  try {
    const ids = await getDemoOrderIds();
    const textoEnviado = message.trim();

    await sendMessageToDatabase({
      pedidoId: selectedChat.pedidoId,
      remetenteId: ids.compradorId,
      texto: textoEnviado,
    });

    const mensagensAtualizadas = await getMessagesByOrderForParticipant(
      selectedChat.pedidoId,
      ids.compradorId
    );

    setChatMessages(mensagensAtualizadas);
    setMessage('');
    await loadChats();
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
  }
}


 return (
  <SafeAreaView style={s.safe}>
   <View style={s.container}>

    <View style={s.header}>
     <View>
      <Text style={s.brand}>Porta a Porta</Text>
      <Text style={s.subtitle}>Compre de quem mora perto</Text>
     </View>

     <Pressable onPress={()=>setScreen('chat')}>
      <Ionicons name="chatbubble-ellipses-outline" size={25} color="#333"/>
     </Pressable>
    </View>

    {screen==='home'&&
     <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Produtos da vizinhança</Text>

      <View style={s.search}>
       <Ionicons name="search" size={18} color="#777"/>
       <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar produto"
        style={s.input}
       />
      </View>

      {filtered.map(p=>
       <View style={s.product} key={p.id}>
        <Image source={{uri:p.image}} style={s.productImg}/>

        <View style={{flex:1,paddingLeft:12}}>
         <Text style={s.seller}>{p.seller}</Text>
         <Text style={s.productName}>{p.name}</Text>
         <Text style={s.price}>{money(p.price)}</Text>

         <Pressable style={s.red} onPress={()=>add(p)}>
          <Text style={s.white}>Adicionar</Text>
         </Pressable>
        </View>
       </View>
      )}
     </ScrollView>
    }

    {screen==='orders'&&
     <ScrollView contentContainerStyle={s.orders}>
      <View style={s.titleRow}>
       <Ionicons name="chevron-back" size={25} color="#333"/>
       <Text style={s.pageTitle}>Meus pedidos</Text>
      </View>

      {orders.map(o=>
       <View style={s.order} key={o.id}>
        <Text style={s.orderStatus}>{o.status}</Text>

        <View style={s.sellerRow}>
         <Image source={{uri:o.image}} style={s.avatar}/>
         <Text style={s.seller}>{o.seller}</Text>
        </View>

        <View style={s.item}>
         <Text style={s.itemName}>{o.product}</Text>
         <Image source={{uri:o.image}} style={s.food}/>
        </View>

        <View style={s.bottom}>
         <View>
          <Text style={s.date}>15/03/2026 15:42</Text>
          <Text style={s.orderPrice}>{money(o.price)}</Text>
         </View>

         <View style={s.actions}>
          <Pressable
           style={s.gray}
           onPress={()=>Alert.alert('Avaliação','Tela de avaliação em desenvolvimento.')}
          >
           <Text style={s.grayText}>Avaliar pedido</Text>
          </Pressable>

          <Pressable
           style={s.redSmall}
           onPress={()=>{
            const p=products.find(x=>x.name===o.product.split(' + ')[0]);
            if(p)add(p);
           }}
          >
           <Text style={s.white}>Peça de novo</Text>
          </Pressable>
         </View>
        </View>

        {o.status!=='Pedido Finalizado'&&
         <Pressable style={s.status} onPress={()=>advance(o.id)}>
          <Text style={s.white}>Avançar status (demonstração)</Text>
         </Pressable>
        }
       </View>
      )}
     </ScrollView>
    }

    {screen==='cart'&&
     <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Carrinho</Text>

      {!cart.length
       ?<Text style={s.empty}>Seu carrinho está vazio.</Text>
       :<>
        {cart.map((p,i)=>
         <View style={s.cartItem} key={`${p.id}-${i}`}>
          <Image source={{uri:p.image}} style={s.cartImg}/>
          <View>
           <Text style={s.productName}>{p.name}</Text>
           <Text style={s.price}>{money(p.price)}</Text>
          </View>
         </View>
        )}

        <Text style={s.total}>
         Total: {money(cart.reduce((a,p)=>a+p.price,0))}
        </Text>

        <Pressable style={s.checkout} onPress={checkout}>
         <Text style={s.white}>Finalizar pedido</Text>
        </Pressable>
       </>
      }
     </ScrollView>
    }

    {screen === 'profile' && (
  <ScrollView contentContainerStyle={s.profile}>
    <Pressable
      style={s.redWide}
      onPress={testDatabase}
    >
      <Text style={s.white}>TESTAR BANCO DE DADOS</Text>
    </Pressable>
      <Ionicons name="person-circle-outline" size={90} color="#d33"/>
      <Text style={s.title}>Meu perfil</Text>
      <Text style={s.profileText}>Caio Matos</Text>
      <Text style={s.profileText}>Bloco A • Apartamento 101</Text>
      <Text style={s.profileText}>caio@email.com</Text>

      <View style={s.profileMenu}>
       <Pressable style={s.menuCard} onPress={()=>setScreen('sellerProfile')}>
        <Ionicons name="storefront-outline" size={24} color="#d33"/>
        <View style={{flex:1}}>
         <Text style={s.menuTitle}>Perfil de vendedor</Text>
         <Text style={s.menuSub}>Gerencie sua loja, produtos e informações</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#777"/>
       </Pressable>

       <Pressable style={s.menuCard} onPress={() => {
  setScreen('sellerDashboard');
  loadSellerSummary();
}}>
        <Ionicons name="bar-chart-outline" size={24} color="#d33"/>
        <View style={{flex:1}}>
         <Text style={s.menuTitle}>Dashboard de vendas</Text>
         <Text style={s.menuSub}>Acompanhe pedidos, receita e ticket médio</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#777"/>
       </Pressable>

       <Pressable style={s.menuCard} onPress={()=>setScreen('chat')}>
        <Ionicons name="chatbubbles-outline" size={24} color="#d33"/>
        <View style={{flex:1}}>
         <Text style={s.menuTitle}>Mensagens</Text>
         <Text style={s.menuSub}>Converse com compradores e vendedores</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#777"/>
       </Pressable>
      </View>
      </ScrollView>
)}

    {screen==='sellerProfile'&&
     <ScrollView contentContainerStyle={s.content}>
      <Back title="Perfil do vendedor" onPress={()=>setScreen('profile')}/>

      <View style={s.sellerProfileHero}>
       <View style={s.logoCircle}>
        <Ionicons name="storefront" size={42} color="#fff"/>
       </View>

       <Text style={s.sellerBig}>Padaria da dona Roberta</Text>
       <Text style={s.sellerRating}>★ 4,9 • 126 avaliações</Text>
       <Text style={s.sellerAddress}>Bloco A • funciona de 08h às 19h</Text>
      </View>

      <Text style={s.sectionTitle}>Sobre a loja</Text>

      <View style={s.infoCard}>
       <Text style={s.infoText}>
        Produtos artesanais preparados pelos moradores do condomínio. Faça seu pedido e combine a retirada ou entrega pelo chat.
       </Text>
      </View>

      <Text style={s.sectionTitle}>Produtos ativos</Text>

      {products
       .filter(p=>p.seller==='Padaria da dona Roberta')
       .map(p=>
        <View style={s.miniProduct} key={p.id}>
         <Image source={{uri:p.image}} style={s.miniImg}/>
         <View style={{flex:1}}>
          <Text style={s.productName}>{p.name}</Text>
          <Text style={s.price}>{money(p.price)}</Text>
         </View>
         <Ionicons name="chevron-forward" size={20} color="#888"/>
        </View>
       )
      }

      <Pressable style={s.redWide} onPress={()=>setScreen('sellerDashboard')}>
       <Text style={s.white}>Abrir dashboard de vendas</Text>
      </Pressable>
     </ScrollView>
    }

    {screen==='sellerDashboard'&&
     <ScrollView contentContainerStyle={s.dashboard}>
      <Back title="Dashboard de Vendas" onPress={()=>setScreen('sellerProfile')}/>

      <View style={s.dashboardTop}>
       <Text style={s.dashStore}>Padaria da dona Roberta</Text>
       <Text style={s.dashPeriod}>Visão geral • Setembro</Text>
      </View>

      

<View style={s.metricRow}>
  <View style={{ flex: 1, minWidth: 0 }}>
    <Metric
      title="Receita do Dia"
      value={`R$ ${dailyRevenue.toFixed(2).replace('.', ',')}`}
      icon="trending-up-outline"
    />
  </View>

  <View style={{ flex: 1, minWidth: 0 }}>
    <Metric
      title="Pedidos Finalizados"
      value={String(salesSummary.totalPedidos)}
      icon="cart-outline"
    />
  </View>

  <View style={{ flex: 1, minWidth: 0 }}>
    <Metric
      title="Ticket Médio"
      value={`R$ ${
        salesSummary.totalPedidos > 0
          ? (salesSummary.faturamentoTotal / salesSummary.totalPedidos)
              .toFixed(2)
              .replace('.', ',')
          : '0,00'
      }`}
      icon="analytics-outline"
    />
  </View>
</View>


      <View style={s.chartCard}>
       <Text style={s.chartTitle}>Receita Mensal</Text>
<Text style={{ color: '#777', fontSize: 13, marginTop: 4 }}>
  Total de vendas finalizadas no mês: R$ {monthlyRevenue.toFixed(2).replace('.', ',')}
</Text>
    

<View style={s.chart}>
  {(() => {
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    const valores = meses.map((_, index) => {
      const registro = monthlySales.find(
        (item) => item.mes === index + 1
      );
      return registro?.faturamento ?? 0;
    });

    const maiorValor = Math.max(...valores, 1);

    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          paddingTop: 20,
          paddingBottom: 25,
        }}
      >
        {valores.map((valor, index) => (
          <View
            key={meses[index]}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
            }}
          >
            <View
              style={{
                width: '55%',
                height: `${Math.max(
                  (valor / maiorValor) * 100,
                  valor > 0 ? 4 : 0
                )}%`,
                backgroundColor: '#2E7D32',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                minHeight: valor > 0 ? 4 : 0,
              }}
            />
            <Text style={{ fontSize: 9, color: '#777', marginTop: 6 }}>
              {meses[index]}
            </Text>
          </View>
        ))}
      </View>
    );
  })()}
</View>
</View>

<Text style={s.sectionTitle}>Feed de Vendas Recentes</Text>

      
      {recentSales.map((sale) => (
        <View style={s.saleRow} key={sale.pedidoId}>
          <Image
            source={
  sale.imagem
    ? { uri: sale.imagem }
    : undefined
}
            style={s.saleAvatar}
          />

          <View style={{ flex: 1 }}>
            <Text style={s.saleTitle}>
              Pedido #{sale.pedidoId}
            </Text>
            <Text style={s.saleTime}>
              {sale.comprador} ·{' '}
              {new Date(sale.dataPedido).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text
              style={{ color: '#777', fontSize: 11 }}
              numberOfLines={1}
            >
              {sale.produtos}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.saleValue}>
              {`R$ ${Number(sale.total).toFixed(2).replace('.', ',')}`}
            </Text>
            <Text style={{ color: '#777', fontSize: 11 }}>
              {sale.status}
            </Text>
          </View>
        </View>
      ))}

      {recentSales.length === 0 && (
        <Text style={{ color: '#777', textAlign: 'center', marginVertical: 20 }}>
          Nenhuma venda encontrada.
        </Text>
      )}

      <View style={s.reportRow}>
       <Pressable style={s.reportBtn}>
        <Text style={s.reportText}>Ver Relatório Completo</Text>
       </Pressable>

       <Pressable style={s.filterBtn}>
        <Text style={s.white}>Filtrar por Data</Text>
       </Pressable>
      </View>
     </ScrollView>
    }

    {screen==='chat'&&
     <ScrollView contentContainerStyle={s.content}>
      <Back title="Mensagens" onPress={()=>setScreen('profile')}/>
      <Text style={s.chatHint}>
       Converse diretamente com moradores e vendedores do condomínio.
      </Text>

      {chats.map(c=>
       <Pressable
        key={c.id}
        style={s.chatRow}
        onPress={() => loadConversation(c)}
       >
        <View style={s.chatAvatar}>
         <Ionicons name="person" size={21} color="#fff"/>
        </View>

        <View style={{flex:1}}>
         <Text style={s.chatName}>{c.name}</Text>
         <Text style={s.chatPreview}>{c.preview}</Text>
        </View>

        <Text style={s.chatTime}>{c.time}</Text>
       </Pressable>
      )}
     </ScrollView>
    }

    {screen==='conversation'&&selectedChat&&
     <View style={s.conversation}>
      <Back title={selectedChat.name} onPress={()=>setScreen('chat')}/>

      <ScrollView contentContainerStyle={s.messages}>
  {chatMessages.map((msg) => (
    <View
      key={msg.id}
      style={
        msg.remetente_id === currentUserId
          ? s.sent
          : s.received
      }
    >
      <Text style={s.msgText}>{msg.texto_mensagem}</Text>
      <Text style={s.msgTime}>
        {new Date(msg.data_envio).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  ))}
</ScrollView>

      <View style={s.composer}>
       <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Digite uma mensagem..."
        style={s.msgInput}
       />

       <Pressable style={s.send} onPress={handleSendMessage}>
        <Ionicons name="send" size={20} color="#fff"/>
       </Pressable>
      </View>
     </View>
    }

   {screen !== 'conversation' && (
  <View style={s.nav}>
    <Nav icon="storefront-outline" label="Vitrine" active={screen==='home'} onPress={()=>setScreen('home')}/>
    <Nav icon="receipt-outline" label="Pedidos" active={screen==='orders'} onPress={()=>setScreen('orders')}/>
    <Nav icon="cart-outline" label={`Carrinho${cart.length ? ` (${cart.length})` : ''}`} active={screen==='cart'} onPress={()=>setScreen('cart')}/>
    <Nav icon="person-outline" label="Perfil" active={screen==='profile'||screen==='sellerProfile'||screen==='sellerDashboard'} onPress={()=>setScreen('profile')}/>
  </View>
)}

   </View>
  </SafeAreaView>
 )
}

function Back({title,onPress}:{title:string;onPress:()=>void}){
 return (
  <View style={s.titleRow}>
   <Pressable onPress={onPress}>
    <Ionicons name="chevron-back" size={25} color="#333"/>
   </Pressable>
   <Text style={s.pageTitle}>{title}</Text>
  </View>
 )
}


function Metric({
  title,
  value,
  icon,
  wide,
}: {
  title: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  wide?: boolean;
}) {
  return (
    <View
      style={[
        s.metric,
        wide && s.metricWide,
        { flex: 1, minWidth: 0 },
      ]}
    >
      <Text
        style={s.metricTitle}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {title}
      </Text>

      <Text
        style={s.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>

      <Ionicons name={icon} size={24} color="#555" />
    </View>
  );
}

function Nav({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.navBtn}>
      <Ionicons name={icon} size={22} color={active ? '#d33' : '#777'} />
      <Text style={[s.navLabel, active && s.active]}>{label}</Text>
    </Pressable>
  );
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#fff8e8'},
 container:{flex:1,backgroundColor:'#fff8e8'},
 header:{height:76,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 brand:{fontSize:22,fontWeight:'800',color:'#292929'},
 subtitle:{fontSize:12,color:'#777'},
 content:{padding:18,paddingBottom:100},
 orders:{padding:20,paddingBottom:100},
 dashboard:{padding:18,paddingBottom:110},
 title:{fontSize:25,fontWeight:'800',color:'#333',marginBottom:18},
 titleRow:{flexDirection:'row',alignItems:'center',marginBottom:18,gap:8},
 pageTitle:{fontSize:24,fontWeight:'800',color:'#333'},
 search:{height:46,backgroundColor:'#fff',borderRadius:12,flexDirection:'row',alignItems:'center',paddingHorizontal:13,marginBottom:16},
 input:{flex:1,marginLeft:8},
 product:{backgroundColor:'#fff',borderRadius:15,marginBottom:14,padding:12,flexDirection:'row',elevation:2},
 productImg:{width:105,height:105,borderRadius:12},
 seller:{fontSize:13,fontWeight:'700',color:'#4b4b4b'},
 productName:{fontSize:17,fontWeight:'800',color:'#333',marginTop:7},
 price:{fontSize:16,fontWeight:'800',color:'#333',marginTop:7},
 red:{backgroundColor:'#e74747',paddingVertical:8,paddingHorizontal:12,borderRadius:8,alignSelf:'flex-start',marginTop:8},
 white:{color:'#fff',fontWeight:'800',fontSize:12},
 order:{backgroundColor:'#dcdcdc',borderRadius:12,padding:16,marginBottom:22,elevation:3},
 orderStatus:{fontSize:17,fontWeight:'800',color:'#4a4a4a',marginBottom:12},
 sellerRow:{flexDirection:'row',alignItems:'center',marginBottom:10},
 avatar:{width:38,height:38,borderRadius:19,marginRight:10},
 item:{backgroundColor:'#cfcfcf',borderRadius:8,minHeight:48,paddingLeft:12,paddingRight:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 itemName:{fontSize:13,fontWeight:'800',color:'#4a4a4a',flex:1},
 food:{width:72,height:38,borderRadius:19},
 bottom:{marginTop:12,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
 date:{fontSize:11,fontWeight:'700',color:'#444'},
 orderPrice:{fontSize:18,fontWeight:'900',color:'#333',marginTop:7},
 actions:{flexDirection:'row',gap:7,alignItems:'center'},
 gray:{backgroundColor:'#e9e9e9',borderRadius:8,paddingVertical:8,paddingHorizontal:10,elevation:1},
 grayText:{color:'#555',fontWeight:'800',fontSize:10},
 redSmall:{backgroundColor:'#e74747',borderRadius:8,paddingVertical:8,paddingHorizontal:10},
 status:{marginTop:12,backgroundColor:'#555',borderRadius:8,paddingVertical:8,alignItems:'center'},
 empty:{color:'#777',fontSize:16,marginTop:20},
 cartItem:{backgroundColor:'#fff',borderRadius:12,padding:10,marginBottom:10,flexDirection:'row',alignItems:'center'},
 cartImg:{width:65,height:65,borderRadius:10,marginRight:12},
 total:{fontSize:21,fontWeight:'900',textAlign:'right',marginTop:12,marginBottom:15},
 checkout:{backgroundColor:'#e74747',borderRadius:10,paddingVertical:14,alignItems:'center'},
 profile:{padding:24,paddingBottom:110,alignItems:'center'},
 profileText:{fontSize:16,color:'#555',marginTop:10},
 profileMenu:{width:'100%',marginTop:28},
 menuCard:{backgroundColor:'#fff',borderRadius:14,padding:15,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12,elevation:2},
 menuTitle:{fontSize:16,fontWeight:'800',color:'#333'},
 menuSub:{fontSize:12,color:'#777',marginTop:4},
 sellerProfileHero:{backgroundColor:'#fff',borderRadius:18,padding:22,alignItems:'center',elevation:2,marginBottom:22},
 logoCircle:{width:82,height:82,borderRadius:41,backgroundColor:'#d94a4a',alignItems:'center',justifyContent:'center',marginBottom:10},
 sellerBig:{fontSize:22,fontWeight:'900',color:'#333',textAlign:'center'},
 sellerRating:{fontSize:15,fontWeight:'800',color:'#555',marginTop:7},
 sellerAddress:{fontSize:13,color:'#777',marginTop:5},
 sectionTitle:{fontSize:20,fontWeight:'900',color:'#333',marginTop:8,marginBottom:10},
 infoCard:{backgroundColor:'#fff',borderRadius:14,padding:15,elevation:1,marginBottom:12},
 infoText:{fontSize:14,lineHeight:21,color:'#555'},
 miniProduct:{backgroundColor:'#fff',borderRadius:13,padding:10,marginBottom:10,flexDirection:'row',alignItems:'center',gap:12},
 miniImg:{width:62,height:62,borderRadius:10},
 redWide:{backgroundColor:'#e74747',borderRadius:10,paddingVertical:14,alignItems:'center',marginTop:10},
 dashboardTop:{backgroundColor:'#000',borderRadius:14,padding:16,marginBottom:12},
 dashStore:{fontSize:18,fontWeight:'900',color:'#fff'},
 dashPeriod:{fontSize:12,color:'#ddd',marginTop:4},

metricRow: {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'stretch',
},

metric: {
  backgroundColor: '#dcdcdc',
  borderRadius: 14,
  padding: 12,
  flex: 1,
  minWidth: 0,
  minHeight: 112,
  justifyContent: 'space-between',
  elevation: 2,
},

metricWide: {
  flex: 1,
},

 metricTitle:{fontSize:13,fontWeight:'800',color:'#222'},
 metricValue:{fontSize:18,fontWeight:'900',color:'#111'},
 chartCard:{backgroundColor:'#dcdcdc',borderRadius:15,padding:16,marginTop:12,elevation:2},
 chartTitle:{fontSize:18,fontWeight:'900',color:'#222',marginBottom:8},
 chart:{height:205,position:'relative',overflow:'hidden'},
 gridLine1:{position:'absolute',left:30,right:0,top:20,borderTopWidth:1,borderTopColor:'#bbb'},
 gridLine2:{position:'absolute',left:30,right:0,top:70,borderTopWidth:1,borderTopColor:'#bbb'},
 gridLine3:{position:'absolute',left:30,right:0,top:120,borderTopWidth:1,borderTopColor:'#bbb'},
 gridLine4:{position:'absolute',left:30,right:0,top:170,borderTopWidth:1,borderTopColor:'#bbb'},
 axis0:{position:'absolute',left:0,top:162,fontSize:11},
 axis1:{position:'absolute',left:0,top:112,fontSize:11},
 axis2:{position:'absolute',left:0,top:62,fontSize:11},
 axis3:{position:'absolute',left:0,top:12,fontSize:11},
 segment:{position:'absolute',height:4,backgroundColor:'#7d858e',borderRadius:2},
 xLabels:{position:'absolute',left:32,right:0,bottom:0,flexDirection:'row',justifyContent:'space-between',paddingRight:12},
 saleRow:{backgroundColor:'#dcdcdc',borderRadius:13,padding:11,marginBottom:10,flexDirection:'row',alignItems:'center',gap:8,elevation:2},
 saleAvatar:{width:48,height:48,borderRadius:24},
 saleTitle:{fontSize:15,fontWeight:'900',color:'#222'},
 saleTime:{fontSize:12,color:'#555',marginTop:2},
 saleValue:{fontSize:16,fontWeight:'900',color:'#222'},
 saleFood:{width:55,height:38,borderRadius:20},
 reportRow:{flexDirection:'row',gap:10,marginTop:8},
 reportBtn:{flex:1,backgroundColor:'#fff',borderRadius:10,paddingVertical:14,alignItems:'center',elevation:2},
 reportText:{fontSize:12,fontWeight:'900',color:'#222'},
 filterBtn:{flex:1,backgroundColor:'#e74747',borderRadius:10,paddingVertical:14,alignItems:'center'},
 chatHint:{fontSize:13,color:'#666',marginBottom:15},
 chatRow:{backgroundColor:'#fff',borderRadius:14,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center',gap:12,elevation:2},
 chatAvatar:{width:48,height:48,borderRadius:24,backgroundColor:'#d94a4a',alignItems:'center',justifyContent:'center'},
 chatName:{fontSize:15,fontWeight:'900',color:'#333'},
 chatPreview:{fontSize:12,color:'#777',marginTop:4},
 chatTime:{fontSize:11,color:'#888'},
 conversation:{flex:1,paddingHorizontal:18,paddingTop:10,paddingBottom:75},
 messages:{flexGrow:1,paddingVertical:12,justifyContent:'flex-end'},
 received:{alignSelf:'flex-start',backgroundColor:'#e2e2e2',borderRadius:14,borderBottomLeftRadius:3,padding:12,maxWidth:'82%',marginBottom:10},
 sent:{alignSelf:'flex-end',backgroundColor:'#e74747',borderRadius:14,borderBottomRightRadius:3,padding:12,maxWidth:'82%',marginBottom:10},
 msgText:{fontSize:14,color:'#222'},
 msgTime:{fontSize:9,color:'#777',marginTop:5,textAlign:'right'},
 composer:{position:'absolute',bottom:5,left:18,right:18,flexDirection:'row',gap:8},
 msgInput:{flex:1,height:48,backgroundColor:'#fff',borderRadius:24,paddingHorizontal:17,elevation:2},
 send:{width:48,height:48,borderRadius:24,backgroundColor:'#e74747',alignItems:'center',justifyContent:'center'},
 nav:{position:'absolute',bottom:0,left:0,right:0,height:72,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#e5e5e5',flexDirection:'row',justifyContent:'space-around',alignItems:'center'},
 navBtn:{alignItems:'center',justifyContent:'center',width:'25%'},
 navLabel:{fontSize:10,color:'#777',marginTop:3,fontWeight:'700'},
 active:{color:'#d33'}
});
