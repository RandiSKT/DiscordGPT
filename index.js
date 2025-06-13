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

// SUBSTITUA A FUNÇÃO ANTIGA POR ESTA
async function obterTokenHotmart() {
  const url = "https://api-sec-vlc.hotmart.com/security/oauth/token";

  // Os seus segredos da Hotmart precisam estar disponíveis em process.env
  const payload = `grant_type=client_credentials&client_id=${process.env.HOTMART_CLIENT_ID}&client_secret=${process.env.HOTMART_CLIENT_SECRET}`;

  try {
    // Usando apenas o axios, que é o correto para Node.js
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // O axios já retorna os dados no formato correto em `response.data`
    return response.data.access_token;
  } catch (error) {
    // Adiciona um log de erro mais claro caso a autenticação com a Hotmart falhe
    console.error(
      "Erro ao obter token da Hotmart:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Falha na autenticação com a Hotmart.");
  }
}
async function verificarCompraHotmart(email, token) {
  const url = `https://api.hotmart.com/payments/api/v1/sales`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    params: { email: email },
  });

  return response.data.items && response.data.items.length > 0;
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
