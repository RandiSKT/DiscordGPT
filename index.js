require("dotenv").config();

// =================================================================
// CÓDIGO DE DEPURAÇÃO - Adicione no topo do seu arquivo
console.log("--- INICIANDO VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE ---");
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? `Recebido (comprimento: ${process.env.DISCORD_TOKEN.length})` : "!!! NÃO RECEBIDO !!!");
console.log("HOTMART_CLIENT_ID:", process.env.HOTMART_CLIENT_ID ? "Recebido" : "!!! NÃO RECEBIDO !!!");
console.log("HOTMART_CLIENT_SECRET:", process.env.HOTMART_CLIENT_SECRET ? "Recebido" : "!!! NÃO RECEBIDO !!!");
console.log("--- FIM DA VERIFICAÇÃO ---");
// Fim do código de depuração
// =================================================================
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
} = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.HOTMART_CLIENT_ID;
const CLIENT_SECRET = process.env.HOTMART_CLIENT_SECRET;
const ROLE_NAME = "MEMBRO GR";
const BUTTON_CUSTOM_ID = "liberar_acesso";
const MODAL_CUSTOM_ID = "email_modal";
const INPUT_CUSTOM_ID = "email_input";

// Comando para criar o botão no canal
client.once("ready", async () => {
  console.log(`✅ Bot logado como ${client.user.tag}`);

  const channel = client.channels.cache.find(
    (ch) => ch.name === "🎯comece-aqui"
  );
  if (!channel) return console.log("❌ Canal não encontrado!");

  const button = new ButtonBuilder()
    .setCustomId(BUTTON_CUSTOM_ID)
    .setLabel("🔓 Liberar Acesso")
    .setStyle(ButtonStyle.Primary);

  await channel.send({
    content:
      "Se você comprou o curso, clique no botão abaixo e informe o e-mail da compra:",
    components: [new ActionRowBuilder().addComponents(button)],
  });

  console.log("📩 Botão enviado no canal.");
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Quando clicam no botão
  if (interaction.isButton() && interaction.customId === BUTTON_CUSTOM_ID) {
    const modal = new ModalBuilder()
      .setCustomId(MODAL_CUSTOM_ID)
      .setTitle("Verificar Acesso via Hotmart")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(INPUT_CUSTOM_ID)
            .setLabel("Digite seu e-mail de compra")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }

  // Quando preenchem o modal
  if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId === MODAL_CUSTOM_ID
  ) {
    const email = interaction.fields.getTextInputValue(INPUT_CUSTOM_ID);
    await interaction.deferReply({ ephemeral: true });

    try {
      const token = await obterTokenHotmart();
      const comprado = await verificarCompraHotmart(email, token);
      console.log("🔐 Token gerado:", token);
      listarTodasCompras(token)

      if (!comprado) {
        return await interaction.editReply(
          "❌ Não encontramos uma compra associada a esse e-mail."
        );
      }

      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      const role = guild.roles.cache.find((role) => role.name === ROLE_NAME);

      if (!role) return await interaction.editReply("❌ Cargo não encontrado.");

      await member.roles.add(role);
      await interaction.editReply(
        "✅ Acesso liberado com sucesso! Bem-vindo(a) à comunidade!"
      );
    } catch (err) {
      console.error("Erro:", err);
      await interaction.editReply(
        "❌ Ocorreu um erro ao verificar seu acesso."
      );
    }
  }
});

async function listarTodasCompras(token) {
  const url = `https://developers.hotmart.com/payments/api/v1/sales`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Vendas retornadas:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Erro ao listar vendas:");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:", error.response.data);
    } else {
      console.log("Mensagem:", error.message);
    }
  }
}

const https = require('follow-redirects').https;

async function obterTokenHotmart() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: 'api-sec-vlc.hotmart.com',
      path: '/security/oauth/token?grant_type=client_credentials&client_id=ebd2c1fb-1c67-4906-a073-2450ecd1470c&client_secret=7b2e3623-d6b9-4f9c-b4d0-7acb6aab64cb',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ZWJkMmMxZmItMWM2Ny00OTA2LWEwNzMtMjQ1MGVjZDE0NzBjOjdiMmUzNjIzLWQ2YjktNGY5Yy1iNGQwLTdhY2I2YWFiNjRjYg=='
      },
      maxRedirects: 20
    };

    const req = https.request(options, (res) => {
      let chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try {
          const json = JSON.parse(body);
          if (json.access_token) {
            console.log("🔑 Token recebido com sucesso.");
            resolve(json.access_token);
          } else {
            console.error("❌ Resposta sem token:", body);
            reject(new Error("Token inválido"));
          }
        } catch (err) {
          console.error("❌ Erro ao parsear resposta:", body);
          reject(err);
        }
      });

      res.on('error', (err) => {
        console.error("❌ Erro na requisição:", err);
        reject(err);
      });
    });

    req.end();
  });
}


async function verificarCompraHotmart(email, token) {
  const url = "https://developers.hotmart.com/payments/api/v1/sales/history?transaction_status=APPROVED";

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    });

    const vendas = response.data?.items || [];
    const encontrou = vendas.some(venda => 
      venda.buyer?.email?.toLowerCase() === email.toLowerCase()
    );

    console.log("📦 Vendas encontradas:", vendas.length);
    console.log("🔍 Email buscado:", email);
    console.log("✅ Compra encontrada?", encontrou);

    return encontrou;
  } catch (error) {
    console.error("❌ Erro ao consultar histórico de vendas:", error.response?.data || error.message);
    return false;
  }
}


client.login(DISCORD_TOKEN);

// ---- INÍCIO DO CÓDIGO PARA ADICIONAR ----

// Cria um servidor HTTP básico para responder aos testes de saúde do Cloud Run
const http = require("http");
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

// O Cloud Run nos dá a porta através da variável de ambiente PORT
const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log(`Servidor de health check ouvindo na porta ${port}`);
});

// ---- FIM DO CÓDIGO PARA ADICIONAR ----
