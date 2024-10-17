const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json()); // Para receber dados JSON

// Configuração do armazenamento de fotos usando multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/fotos');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jerudusizausu@gmail.com',
    pass: 'gta5free'
  }
});

// Rota principal para exibir o formulário
app.get('/', (req, res) => {
  res.render('index');
});

// Rota para iniciar o pagamento (direciona para a Kiwify)
app.post('/iniciar-pagamento', upload.array('fotos', 5), (req, res) => {
  const { nome, homenagem } = req.body;
  const fotos = req.files;

  if (!fotos || fotos.length === 0) {
    return res.status(400).json({ error: 'Nenhuma foto foi enviada.' });
  }

  const clienteDados = {
    nome,
    homenagem,
    fotos: fotos.map(file => file.filename)
  };

  // Gera a página com a homenagem
  const siteHtml = `
    <html>
      <head>
        <title>${clienteDados.nome} e você</title>
        <style>
          body {
            text-align: center;
            background-color: #f8e8e8;
            font-family: Arial, sans-serif;
          }
          h1 {
            color: #ff69b4;
          }
          p {
            color: #333;
            font-size: 18px;
          }
          img {
            max-width: 300px;
            margin: 20px;
            border-radius: 10px;
          }
        </style>
      </head>
      <body>
        <h1>${clienteDados.nome} e você</h1>
        <p>${clienteDados.homenagem}</p>
        ${clienteDados.fotos.map(foto => `<img src="/uploads/fotos/${foto}" alt="Foto do casal">`).join('')}
      </body>
    </html>
  `;

  const sitePath = `./public/sites/${clienteDados.nome}-site.html`;
  fs.writeFileSync(sitePath, siteHtml);

  // Redireciona o usuário para a página de checkout da Kiwify
  const checkoutUrl = 'https://pay.kiwify.com.br/nq9luob';
  res.redirect(checkoutUrl);
});

// Rota para receber o webhook da Kiwify
app.post('/webhook-kiwify', (req, res) => {
  const { email, status } = req.body;

  // Verifica se o pagamento foi concluído com sucesso
  if (status === 'completed') {
    const clienteNome = 'felipe'; // Você pode ajustar isso conforme o necessário
    const siteUrl = `https://homenagem-on.onrender.com${clienteNome}-site.html`; // Ajuste se necessário

    // Configura o e-mail a ser enviado com a URL da homenagem
    const mailOptions = {
      from: 'SEU_EMAIL@gmail.com',
      to: email,
      subject: 'Sua Homenagem',
      text: `Aqui está a URL da sua homenagem: ${siteUrl}`
    };

    // Envia o e-mail para o cliente
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log('Erro ao enviar e-mail:', error);
      }
      console.log('E-mail enviado:', info.response);
    });

    res.status(200).send('Webhook recebido com sucesso');
  } else {
    res.status(400).send('Pagamento não concluído');
  }
});

// Rota para simular o recebimento do webhook e envio do e-mail (para testar sem pagar)
app.post('/simular-webhook', (req, res) => {
  const email = 'email_do_teste@example.com'; // Coloque o e-mail de teste
  const clienteNome = 'NOME_DO_CLIENTE'; // Coloque o nome do cliente aqui
  const siteUrl = `https://SEU_DOMINIO/render.com/sites/${clienteNome}-site.html`; // Use o domínio do seu site hospedado no Render

  // Configura o e-mail a ser enviado com a URL da homenagem
  const mailOptions = {
    from: 'SEU_EMAIL@gmail.com',
    to: email,
    subject: 'Sua Homenagem',
    text: `Aqui está a URL da sua homenagem: ${siteUrl}`
  };

  // Envia o e-mail para o cliente
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log('Erro ao enviar e-mail:', error);
    }
    console.log('E-mail enviado:', info.response);
  });

  res.status(200).send('Simulação de webhook concluída e e-mail enviado');
});

// Servir os sites gerados
app.use('/sites', express.static(path.join(__dirname, 'public/sites')));

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
