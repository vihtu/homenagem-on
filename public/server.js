const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Configuração do armazenamento de fotos usando multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads/fotos');
    
    // Verifica se o diretório existe, caso contrário, cria
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) return cb(err);
      cb(null, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rota principal para exibir o formulário
app.get('/', (req, res) => {
  res.render('index');
});

// Rota para receber dados do formulário
app.post('/enviar-dados', upload.array('fotos', 5), (req, res) => {
  const nome = req.body.nome;
  const homenagem = req.body.homenagem;
  const fotos = req.files;

  // Salvar dados no banco de dados ou sessão
  const clienteDados = {
    nome,
    homenagem,
    fotos: fotos.map(file => file.filename)
  };

  // Salvar os dados do cliente em um arquivo JSON
  fs.writeFileSync(`./uploads/dados-${Date.now()}.json`, JSON.stringify(clienteDados));

  // URL do checkout da Kiwify
  const kiwifyCheckoutUrl = 'https://pay.kiwify.com.br/lDJQr89'; // Verifique se esta URL está correta

  // Log para verificar a URL do checkout
  console.log(`Redirecionando para: ${kiwifyCheckoutUrl}`);

  // Redirecionar para o checkout da Kiwify
  res.redirect(kiwifyCheckoutUrl);
});

// Webhook da Kiwify para confirmar pagamento
app.post('/webhook-kiwify', express.json(), (req, res) => {
  const data = req.body;

  if (data.status === 'paid') {
    // Aqui você deve ter uma maneira de identificar qual arquivo JSON usar
    const clienteDadosFilePath = './uploads/dados-xxxx.json'; // Ajuste para buscar o arquivo correto

    // Ler e analisar os dados do cliente
    const clienteDados = JSON.parse(fs.readFileSync(clienteDadosFilePath, 'utf-8'));

    // Geração do site personalizado
    const siteHtml = `
      <html>
        <body>
          <h1>${clienteDados.nome} e você</h1>
          <p>${clienteDados.homenagem}</p>
          ${clienteDados.fotos.map(foto => `<img src="/uploads/fotos/${foto}" alt="Foto do casal">`).join('')}
        </body>
      </html>
    `;

    const sitePath = `./public/sites/${clienteDados.nome}-site.html`;
    fs.writeFileSync(sitePath, siteHtml);

    // Retornar a URL do site gerado
    res.status(200).json({ url: `/sites/${clienteDados.nome}-site.html` });
  } else {
    res.status(200).send('OK');
  }
});

// Servir os sites gerados
app.use('/sites', express.static(path.join(__dirname, 'public/sites')));

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
