import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initializeDatabase, seedDatabase, getProducts } from './src/database/database';

type Product = { id:number; seller:string; name:string; price:number; image:string };
type Order = { id:number; seller:string; product:string; price:number; image:string; status:string };
type Chat = { id:number; name:string; preview:string; time:string };

const products: Product[] = [
 {id:1,seller:'Padaria da dona Roberta',name:'Misto Quente',price:29.5,image:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600'},
 {id:2,seller:'Padaria da dona Roberta',name:'Hamburguer Duplo',price:39.9,image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600'},
 {id:3,seller:'Sabor de Casa',name:'Bolo de Chocolate',price:25,image:'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'},
 {id:4,seller:'Sabor de Casa',name:'Suco Natural 1L',price:12,image:'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600'}
];

const initialOrders: Order[] = [
 {id:1001,seller:'Padaria da dona Roberta',product:'Misto Quente',price:29.5,image:products[0].image,status:'Pedido Finalizado'},
 {id:1002,seller:'Padaria da dona Roberta',product:'Hamburguer Duplo',price:39.9,image:products[1].image,status:'Pedido Finalizado'}
];

const chats: Chat[] = [
 {id:1,name:'Padaria da dona Roberta',preview:'Seu pedido ficará pronto às 16:30.',time:'16:10'},
 {id:2,name:'Sabor de Casa',preview:'Olá! O bolo está disponível hoje.',time:'14:42'},
 {id:3,name:'João - Bloco B',preview:'Obrigado pela compra!',time:'Ontem'}
];

const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

type Screen = 'home'|'orders'|'cart'|'profile'|'sellerProfile'|'sellerDashboard'|'chat'|'conversation';

export default function App(){

  useEffect(() => {
    initializeDatabase()
      .then(() => seedDatabase())
      .then(() => {
        console.log('SQLite pronto!');
      })
      .catch((error) => {
        console.error('Erro SQLite:', error);
      });
  }, []);

 const [screen,setScreen]=useState<Screen>('orders');
 const [search,setSearch]=useState('');
 const [cart,setCart]=useState<Product[]>([]);
 const [orders,setOrders]=useState<Order[]>(initialOrders);
 const [selectedChat,setSelectedChat]=useState<Chat | null>(null);
 const [message,setMessage]=useState('');
 const filtered=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

 function add(p:Product){
  setCart(c=>[...c,p]);
  Alert.alert('Produto adicionado',`${p.name} foi adicionado ao carrinho.`);
 }

 function checkout(){
  if(!cart.length){
   Alert.alert('Carrinho vazio','Adicione um produto antes de finalizar.');
   return;
  }

  const p=cart[0], total=cart.reduce((s,x)=>s+x.price,0);

  setOrders(o=>[
   {
    id:Date.now(),
    seller:p.seller,
    product:cart.length>1?`${p.name} + ${cart.length-1} item(ns)`:p.name,
    price:total,
    image:p.image,
    status:'Pedido Pendente'
   },
   ...o
  ]);

  setCart([]);
  setScreen('orders');
  Alert.alert('Pedido realizado','Seu pedido foi registrado com sucesso.');
 }

 function advance(id:number){
  setOrders(os=>os.map(o=>
   o.id===id
    ? {
       ...o,
       status:
        o.status==='Pedido Pendente'
         ?'Pedido Aceito'
         :o.status==='Pedido Aceito'
          ?'Em preparo'
          :o.status==='Em preparo'
           ?'A caminho'
           :'Pedido Finalizado'
      }
    :o
  ));
 }

 function sendMessage(){
  if(!message.trim()) return;
  Alert.alert('Mensagem enviada',message.trim());
  setMessage('');
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

    {screen==='profile'&&
     <ScrollView contentContainerStyle={s.profile}>
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

       <Pressable style={s.menuCard} onPress={()=>setScreen('sellerDashboard')}>
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
    }

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
       <Metric title="Receita do Dia" value="R$ 1.250,00" icon="trending-up-outline" wide/>
       <Metric title="Pedidos" value="45" icon="cart-outline"/>

       <View style={{width:'31%'}}>
        <Metric title="Ticket Médio" value="R$ 27,80" icon="analytics-outline"/>
       </View>
      </View>

      <View style={s.chartCard}>
       <Text style={s.chartTitle}>Receita Mensal</Text>

       <View style={s.chart}>
        <View style={s.gridLine1}/>
        <View style={s.gridLine2}/>
        <View style={s.gridLine3}/>
        <View style={s.gridLine4}/>

        <Text style={s.axis0}>0</Text>
        <Text style={s.axis1}>100</Text>
        <Text style={s.axis2}>200</Text>
        <Text style={s.axis3}>300</Text>

        <View style={[s.segment,{left:28,top:125,width:62,transform:[{rotate:'-24deg'}]}]}/>
        <View style={[s.segment,{left:83,top:101,width:72,transform:[{rotate:'-8deg'}]}]}/>
        <View style={[s.segment,{left:146,top:91,width:67,transform:[{rotate:'-43deg'}]}]}/>
        <View style={[s.segment, { left: 203, top: 49, width: 63, transform: [{ rotate: '18deg' }] }]} />

<View style={[s.segment, { left: 258, top: 69, width: 62, transform: [{ rotate: '23deg' }] }]} />

<View style={[s.segment, { left: 315, top: 94, width: 55, transform: [{ rotate: '-18deg' }] }]} />
        <View style={s.xLabels}>
         <Text>Set</Text>
         <Text>Out</Text>
         <Text>Nov</Text>
         <Text>Dez</Text>
        </View>
       </View>
      </View>

      <Text style={s.sectionTitle}>Feed de Vendas Recentes</Text>

      {[
       ['Venda #1002','16:15','R$ 55,90',products[0].image],
       ['Venda #1002','16:15','R$ 39,90',products[1].image],
       ['Venda #1001','15:42','R$ 29,50',products[0].image]
      ].map((v,i)=>
       <View style={s.saleRow} key={i}>
        <Image source={{uri:v[3]}} style={s.saleAvatar}/>

        <View style={{flex:1}}>
         <Text style={s.saleTitle}>{v[0]}</Text>
         <Text style={s.saleTime}>{v[1]}</Text>
        </View>

        <Text style={s.saleValue}>{v[2]}</Text>
        <Image source={{uri:v[3]}} style={s.saleFood}/>
        <Ionicons name="checkmark-circle" size={23} color="#777"/>
       </View>
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
        onPress={()=>{
         setSelectedChat(c);
         setScreen('conversation');
        }}
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
       <View style={s.received}>
        <Text style={s.msgText}>{selectedChat.preview}</Text>
        <Text style={s.msgTime}>{selectedChat.time}</Text>
       </View>

       <View style={s.sent}>
        <Text style={s.msgText}>Olá! Gostaria de confirmar meu pedido.</Text>
        <Text style={s.msgTime}>16:12</Text>
       </View>
      </ScrollView>

      <View style={s.composer}>
       <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Digite uma mensagem..."
        style={s.msgInput}
       />

       <Pressable style={s.send} onPress={sendMessage}>
        <Ionicons name="send" size={20} color="#fff"/>
       </Pressable>
      </View>
     </View>
    }

    <View style={s.nav}>
     <Nav icon="storefront-outline" label="Vitrine" active={screen==='home'} onPress={()=>setScreen('home')}/>
     <Nav icon="receipt-outline" label="Pedidos" active={screen==='orders'} onPress={()=>setScreen('orders')}/>
     <Nav icon="cart-outline" label={`Carrinho${cart.length?` (${cart.length})`:''}`} active={screen==='cart'} onPress={()=>setScreen('cart')}/>
     <Nav icon="person-outline" label="Perfil" active={screen==='profile'||screen==='sellerProfile'||screen==='sellerDashboard'} onPress={()=>setScreen('profile')}/>
    </View>

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
    <View style={[s.metric, wide && s.metricWide]}>
      <Text style={s.metricTitle}>{title}</Text>
      <Text style={s.metricValue}>{value}</Text>
      <Ionicons name={icon} size={27} color="#555" />
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
 metricRow:{flexDirection:'row',gap:8,alignItems:'stretch'},
 metric:{backgroundColor:'#dcdcdc',borderRadius:14,padding:12,width:'33%',minHeight:112,justifyContent:'space-between',elevation:2},
 metricWide:{width:'34%'},
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
