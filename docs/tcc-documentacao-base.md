# Conteudo Base para o DOCX do TCC

## Correcao documental do frontend

O frontend do FightPass foi mantido como camada visual separada, sem integracao com o backend nesta etapa. Essa decisao foi adotada para permitir que a implementacao da API, do banco de dados e das regras de negocio fosse realizada com maior organizacao tecnica, preservando o prototipo visual ja consolidado. Durante a analise do frontend foram identificadas telas consistentes com os fluxos principais do sistema, mas tambem foram encontrados links para paginas ausentes, inconsistencias de nomenclatura e ausencia de processamento real dos dados. Por esse motivo, a documentacao passa a apresentar o frontend como prototipo funcional da interface, enquanto o backend implementa efetivamente a logica de negocio, a persistencia e a seguranca.

Foram adicionadas paginas de apoio para os fluxos de cadastro realizado, envio de email de recuperacao e painel de gestao institucional, eliminando lacunas de navegacao existentes no prototipo. Essas adicoes nao caracterizam integracao completa entre frontend e backend, mas sim um ajuste documental e estrutural para que todas as telas relevantes previstas no fluxo do usuario estejam representadas.

## Arquitetura do backend

O backend foi desenvolvido em Node.js com o framework Express, adotando uma arquitetura organizada por modulos. A aplicacao foi dividida em rotas especializadas para autenticacao, perfil, catalogo de instituicoes e modalidades, turmas, agendamentos, check-in, avaliacoes e dashboards. Esse arranjo favorece a separacao de responsabilidades e prepara o sistema para futura evolucao, manutencao e implantacao em nuvem.

O sistema utiliza autenticacao baseada em JSON Web Token, com controle de acesso por perfil de usuario. Os principais perfis definidos para o sistema sao aluno, instrutor e administrador da instituicao. A API foi preparada para funcionar de forma desacoplada, permitindo futura integracao com o frontend ja existente sem necessidade de alterar a arquitetura central.

## Persistencia em MySQL

Foi definida uma estrutura relacional em MySQL para suportar os fluxos observados no frontend e as regras de negocio inferidas. O banco contempla tabelas de usuarios, papeis, instituicoes, enderecos, modalidades, vinculos entre usuarios e instituicoes, turmas, horarios, matriculas, agendamentos, tokens de check-in, presencas, avaliacoes, historico de progresso, redefinicao de senha e auditoria. Essa modelagem busca coerencia entre a interface, os processos operacionais e a necessidade de relatorios gerenciais.

## Seguranca e validacao

O backend aplica validacoes de entrada nos endpoints, utiliza hash seguro para senhas e adota mensagens genericas em operacoes sensiveis de autenticacao. No fluxo de login, o sistema retorna apenas a mensagem "Credenciais invalidas" em caso de falha, sem informar se o erro ocorreu no email ou na senha. No fluxo de recuperacao de senha, a resposta tambem e neutra, evitando a confirmacao publica da existencia de um email cadastrado.

## Consideracoes para implantacao futura em nuvem

O backend foi estruturado para futura publicacao em ambiente de nuvem, com configuracoes externalizadas por variaveis de ambiente, organizacao modular e separacao clara entre regras de negocio e transporte HTTP. Como trabalho futuro, recomenda-se complementar a solucao com envio real de email, observabilidade, testes automatizados e integracao efetiva com o frontend.
