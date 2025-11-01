// CORRIGIDO: Const para const (padrão JS)
const QUESTIONS_PER_BLOCK = 10; 
let originalQuestions = [];
let shuffledQuestions = [];
let currentBlock = 0;
let totalHits = 0;
let totalErrors = 0;
let userAnswers = {}; 

const quizContent = document.getElementById('quiz-content');
const quizSubtitle = document.getElementById('quiz-subtitle'); 
const navigationArea = document.getElementById('navigation-area');
const resultsArea = document.getElementById('results-area');
const validationMessage = document.getElementById('validation-message');

const motivationMessages = [
    "Parabéns pelo primeiro bloco! Você domina os conceitos básicos do Windows. Mantenha o foco, a excelência está logo ali!",
    "Impressionante! A segunda etapa concluída com sucesso. Cada acerto é um passo mais perto da proficiência total. Continue com essa determinação!",
    "Você está no ritmo certo! Passar da metade do caminho com essa performance é digno de nota. Continue assim!",
    "Quarto bloco concluído! Sua concentração e conhecimento estão afiados. Não perca o embalo, a reta final está próxima!",
    "Excelente! Este é o seu último bloco. Use todo o seu conhecimento acumulado para finalizar com chave de ouro.",
    "Fim de jogo! Você chegou ao final do quiz. Sua persistência e dedicação são a chave para o domínio do Pacote Office. Orgulhe-se do seu esforço!"
];

// =======================================================
// NOVAS FUNÇÕES: LEITURA DE TEXTO (TEXT-TO-SPEECH - TTS)
// LÓGICA ROBUSTA PARA CARREGAMENTO DE VOZES (MAIOR COMPATIBILIDADE)
// =======================================================

let vozPortugues = null;

// Lógica de carregamento robusto
function carregarVozes() {
    if (vozPortugues) return; // Já carregou

    const vozes = speechSynthesis.getVoices();
    
    // Tenta encontrar uma voz em Português do Brasil.
    const ptVoice = vozes.find(voice => 
        voice.lang === 'pt-BR' || 
        voice.lang === 'pt_BR' || 
        (voice.lang.startsWith('pt-') && !voice.lang.includes('PT')) // Captura 'pt-pt' mas prefere 'pt-br'
    );
    
    if (ptVoice) {
        vozPortugues = ptVoice;
    } else if (vozes.length === 0) {
        // CORREÇÃO: Se a lista de vozes está vazia, o navegador ainda não as carregou.
        // Tenta novamente em 200ms.
        console.log("Vozes do sistema não carregadas. Tentando novamente...");
        setTimeout(carregarVozes, 200);
    } else {
        console.warn("Voz em Português (pt-BR) não foi encontrada. O navegador usará uma voz padrão, que pode não ser em Português.");
    }
}

// O evento 'onvoiceschanged' é a forma ideal, mas pode falhar.
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = carregarVozes;
    // Tenta carregar imediatamente no início, caso o evento já tenha disparado.
    carregarVozes(); 
}


function pararLeitura() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

function lerTexto(textoParaLer) {
    pararLeitura();

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textoParaLer);
        
        // 1. Tenta usar a voz específica que encontramos (vozPortugues agora é mais confiável)
        if (vozPortugues) {
            utterance.voice = vozPortugues;
        } else {
            // 2. Se falhar, pelo menos define a língua
            utterance.lang = 'pt-BR'; 
        }

        // 3. Adiciona um pequeno atraso (Timeout de 100ms)
        setTimeout(() => {
            speechSynthesis.speak(utterance);
        }, 100); 

    } else {
        console.warn('Web Speech API não suportada neste navegador.');
    }
}

// =======================================================
// FIM DAS FUNÇÕES TTS
// =======================================================


// --- FUNÇÃO DE ALEATORIEDADE ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 1. Carregar as perguntas
async function loadQuestions() {
    pararLeitura(); 
    quizSubtitle.textContent = "Carregando Quiz...";
    quizContent.innerHTML = "<p>Tentando carregar as perguntas...</p>";
    
    try {
        const response = await fetch('questions.json', {
            method: 'GET',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP ao carregar JSON: status ${response.status}. Verifique o nome do arquivo.`);
        }
        
        originalQuestions = await response.json();
        
        if (originalQuestions.length > 50) {
            originalQuestions = originalQuestions.slice(0, 50);
        }
        
        if (originalQuestions.length === 0) {
            throw new Error("O arquivo questions.json está vazio ou mal formatado.");
        }
        
        startQuiz();
    } catch (error) {
        quizSubtitle.textContent = "Falha no Carregamento";
        quizContent.innerHTML = `
            <div style="color: red; padding: 20px; border: 1px solid red; border-radius: 5px;">
                <p><strong>Erro: Não foi possível carregar as perguntas.</strong></p>
                <p><strong>Causa Comum:</strong> Restrições de segurança do navegador (CORS) ao abrir o arquivo <code>index.html</code> diretamente (protocolo <code>file://</code>).</p>
                <p><strong>Solução Recomendada:</strong> Use um servidor local (como a extensão "Live Server" no VS Code) para abrir o <code>index.html</code> através do protocolo <code>http://</code>.</p>
                <p>Detalhes técnicos: ${error.message}</p>
            </div>
        `;
        navigationArea.style.display = 'none';
        console.error("Erro ao carregar questions.json:", error);
    }
}

// 2. Iniciar o Quiz
function startQuiz() {
    pararLeitura(); 
    shuffledQuestions = [...originalQuestions]; 
    shuffleArray(shuffledQuestions);

    currentBlock = 0;
    totalHits = 0;
    totalErrors = 0;
    userAnswers = {};
    renderBlock();
    navigationArea.style.display = 'flex'; 
    resultsArea.style.display = 'none';
}

// 3. Renderizar o bloco atual
function renderBlock() {
    pararLeitura(); 
    const startIdx = currentBlock * QUESTIONS_PER_BLOCK;
    const endIdx = startIdx + QUESTIONS_PER_BLOCK;
    const blockQuestions = shuffledQuestions.slice(startIdx, endIdx);
    
    const totalBlocks = Math.ceil(shuffledQuestions.length / QUESTIONS_PER_BLOCK);
    quizSubtitle.textContent = `Bloco ${currentBlock + 1} de ${totalBlocks} (${QUESTIONS_PER_BLOCK} Perguntas)`;

    quizContent.innerHTML = '';
    resultsArea.style.display = 'none';

    blockQuestions.forEach((q, index) => {
        const globalIndex = startIdx + index + 1;
        const questionHtml = createQuestionHtml(q, globalIndex);
        quizContent.appendChild(questionHtml);
    });

    validationMessage.style.display = 'none';
    
    updateNavigationButtons();
}

// 4. Criar HTML da pergunta (MODIFICADA para incluir botão de áudio nas opções)
function createQuestionHtml(question, globalIndex) {
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block';
    qBlock.dataset.id = question.id;

    const formattedNumber = String(globalIndex).padStart(2, '0');

    // Container para o número, texto da pergunta E o botão de áudio da PERGUNTA
    const qHeader = document.createElement('div');
    qHeader.className = 'question-header';
    
    const qText = document.createElement('p');
    qText.className = 'question-text';
    qText.textContent = `${formattedNumber}. ${question.question}`;
    
    // Botão de áudio da PERGUNTA
    const audioButtonQuestion = document.createElement('button');
    audioButtonQuestion.textContent = '🔊';
    audioButtonQuestion.className = 'audio-button question-audio';
    audioButtonQuestion.ariaLabel = `Ouvir pergunta ${formattedNumber}`;

    // Evento de clique para ler a PERGUNTA
    audioButtonQuestion.onclick = () => lerTexto(question.question); 
    
    qHeader.appendChild(qText);
    qHeader.appendChild(audioButtonQuestion);
    qBlock.appendChild(qHeader); 

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'answer-options';

    const letters = ['A', 'B', 'C', 'D', 'E'];

    question.options.forEach((option, index) => {
        const optionWrapper = document.createElement('div');
        optionWrapper.className = 'option-wrapper';

        // Container para o botão de resposta e o botão de áudio da opção
        const optionFlex = document.createElement('div');
        optionFlex.className = 'option-flex';

        // Botão de Opção de Resposta
        const optionButton = document.createElement('button');
        optionButton.textContent = `${letters[index]}) ${option.text}`;
        optionButton.dataset.correct = option.isCorrect;
        optionButton.dataset.index = index;
        optionButton.dataset.rationale = option.rationale;
        optionButton.onclick = (e) => handleAnswer(e.target, question.id, index);
        optionButton.className = 'option-select-button'; // Nova classe para estilizar

        // NOVO: Botão de áudio da OPÇÃO
        const audioButtonOption = document.createElement('button');
        audioButtonOption.textContent = '🔊';
        audioButtonOption.className = 'audio-button option-audio';
        audioButtonOption.ariaLabel = `Ouvir opção ${letters[index]}`;
        
        // Evento de clique para ler a OPÇÃO
        // O texto a ser lido é a letra e o texto da opção
        audioButtonOption.onclick = (e) => {
            e.stopPropagation(); // Evita que o clique no audioButtonOption dispare o handleAnswer
            lerTexto(`Opção ${letters[index]}, ${option.text}`);
        };

        // Adiciona os botões ao container flex
        optionFlex.appendChild(optionButton);
        optionFlex.appendChild(audioButtonOption);
        
        // Adiciona o container flex ao wrapper da opção
        optionWrapper.appendChild(optionFlex);
        optionsDiv.appendChild(optionWrapper);
    });

    qBlock.appendChild(optionsDiv);

    if (userAnswers[question.id] !== undefined) {
        const answeredIndex = userAnswers[question.id].selectedIndex;
        const answeredButton = qBlock.querySelector(`button.option-select-button[data-index="${answeredIndex}"]`);
        
        if (answeredButton) {
            handleAnswer(answeredButton, question.id, answeredIndex, false);
        }

        qBlock.querySelectorAll('button.option-select-button, button.option-audio').forEach(btn => btn.disabled = true);
    }

    return qBlock;
}

// 5. Lidar com a resposta
function handleAnswer(selectedButton, questionId, selectedIndex, shouldUpdateScore = true) {
    pararLeitura(); // Parar a leitura quando uma resposta for dada
    const qBlock = selectedButton.closest('.question-block');
    const question = originalQuestions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = question.options[selectedIndex].isCorrect === true || question.options[selectedIndex].isCorrect === 'true';

    if (shouldUpdateScore) {
        userAnswers[questionId] = {
            isCorrect: isCorrect,
            selectedIndex: selectedIndex
        };
    }
    
    showFeedback(qBlock, isCorrect, selectedIndex);

    // Desabilita todos os botões de opção e áudio das opções
    qBlock.querySelectorAll('button.option-select-button, button.option-audio').forEach(btn => btn.disabled = true);
    qBlock.querySelector('button.question-audio').disabled = true; // Desabilita o áudio da pergunta também
    
    validationMessage.style.display = 'none'; 

    if (shouldUpdateScore) {
        // Recalcula o placar e atualiza botões/resultados
        recalculateTotalScore();
        updateNavigationButtons();
    }
}


// 6. Mostrar feedback visual e explicação
function showFeedback(qBlock, selectedIsCorrect, selectedIndex) {
    const buttons = qBlock.querySelectorAll('button.option-select-button');
    let correctRationale = '';

    if (qBlock.querySelector('.rationale-text')) { qBlock.querySelector('.rationale-text').remove(); }
    qBlock.querySelectorAll('.feedback-correct, .feedback-incorrect').forEach(span => span.remove());
    qBlock.querySelectorAll('.correct, .incorrect').forEach(btn => btn.classList.remove('correct', 'incorrect'));
    

    buttons.forEach(btn => {
        btn.disabled = true;
        const isCurrentCorrect = btn.dataset.correct === 'true';

        if (isCurrentCorrect) {
            btn.classList.add('correct');
            correctRationale = btn.dataset.rationale;
        }

        const isCurrentlySelected = parseInt(btn.dataset.index) === selectedIndex;

        if (isCurrentlySelected) {
            if (!selectedIsCorrect) {
                 btn.classList.add('incorrect');
            }
           
            const feedbackSpan = document.createElement('span');
            feedbackSpan.className = selectedIsCorrect ? 'feedback-correct' : 'feedback-incorrect';
            feedbackSpan.textContent = selectedIsCorrect ? ' ✅ Correto' : ' ❌ Erro';
            // Insere o feedback após o botão de seleção (que está dentro de optionFlex)
            btn.closest('.option-flex').insertAdjacentElement('afterend', feedbackSpan);
        }
    });


    const rationaleDiv = document.createElement('div');
    rationaleDiv.className = 'rationale-text';
    rationaleDiv.textContent = `Explicação: ${correctRationale}`;
    qBlock.appendChild(rationaleDiv);
}

// 7. Checar conclusão do bloco e mostrar/esconder resultados
function checkBlockCompletionState() {
    const startIdx = currentBlock * QUESTIONS_PER_BLOCK;
    const endIdx = startIdx + QUESTIONS_PER_BLOCK;
    const blockQuestions = shuffledQuestions.slice(startIdx, endIdx);
    
    const answeredInBlock = blockQuestions.filter(q => userAnswers[q.id] !== undefined).length;
    
    const isBlockComplete = answeredInBlock === blockQuestions.length; 
    
    if (isBlockComplete) {
        displayBlockResults(); 
    } else {
        resultsArea.style.display = 'none'; 
    }
    
    validationMessage.style.display = 'none';
    
    return isBlockComplete;
}

// 8. Recalcular pontuação total 
function recalculateTotalScore() {
    totalHits = 0;
    totalErrors = 0;
    Object.values(userAnswers).forEach(answer => {
        if (answer.isCorrect) totalHits++;
        else totalErrors++;
    });
}

// 9. Exibir resultado do bloco (incluindo botão de sair)
function displayBlockResults() {
    const startIdx = currentBlock * QUESTIONS_PER_BLOCK;
    const endIdx = startIdx + QUESTIONS_PER_BLOCK;
    const blockQuestions = shuffledQuestions.slice(startIdx, endIdx);

    let blockHits = 0;
    let blockErrors = 0;

    blockQuestions.forEach(q => {
        const answer = userAnswers[q.id];
        if (answer) {
            if (answer.isCorrect) blockHits++;
            else blockErrors++;
        }
    });

    const totalQuestions = shuffledQuestions.length;
    const currentTotalAnswered = Object.keys(userAnswers).length;

    const LAST_MESSAGE_INDEX = motivationMessages.length - 1; 
    let messageIndex = Math.min(currentBlock, LAST_MESSAGE_INDEX - 1); 

    if (currentTotalAnswered === totalQuestions) {
        messageIndex = LAST_MESSAGE_INDEX;
    } 

    const exitButtonHtml = `
        <button class="nav-button exit-button" onclick="exitQuiz()">Sair do Quiz</button>
    `;

    resultsArea.innerHTML = `
        <h3>Bloco ${currentBlock + 1} Concluído!</h3>
        <p class="score-summary">Acertos no Bloco: <strong>${blockHits}</strong></p>
        <p class="score-summary">Erros no Bloco: <strong>${blockErrors}</strong></p>
        <hr>
        <p class="score-summary">Total Geral: Acertos <strong>${totalHits}</strong> / Erros <strong>${totalErrors}</strong> (de ${currentTotalAnswered} perguntas)</p>
        <p class="motivation-message">${motivationMessages[messageIndex]}</p>
        
        <div class="final-buttons" style="margin-top: 20px;">
            ${exitButtonHtml}
        </div>
    `;
    resultsArea.style.display = 'block';
}

// 10. Atualizar botões de navegação (Lado a Lado)
function updateNavigationButtons() {
    navigationArea.innerHTML = '';
    
    // ⭐️ Chamada única para verificar o estado de conclusão
    const isBlockComplete = checkBlockCompletionState();
    
    const totalBlocks = Math.ceil(shuffledQuestions.length / QUESTIONS_PER_BLOCK);
    const isLastBlock = currentBlock >= totalBlocks - 1;
    
    let buttonsHtml = '';

    // 1. Botão Voltar (somente a partir do Bloco 2)
    // Usa um div vazio para manter o alinhamento lado a lado no CSS, se não houver botão Voltar.
    const backButtonHtml = currentBlock > 0 
        ? `<button class="nav-button back-button" onclick="navigateBack()">Voltar</button>`
        : `<div style="min-width: 120px;"></div>`;
    
    
    // 2. Botões Próximo ou Finalizar
    let primaryButtonText = isLastBlock ? 'Finalizar Quiz' : 'Próximo Bloco';
    let primaryButtonClass = isLastBlock ? 'finish-button' : 'next-button';
    let primaryButtonAction = isLastBlock ? 'finishQuiz()' : 'navigateNext()';
    let primaryButtonDisabled = isBlockComplete ? '' : 'disabled';
    
    const primaryButtonHtml = `
        <button class="nav-button ${primaryButtonClass}" onclick="${primaryButtonAction}" ${primaryButtonDisabled}>
            ${primaryButtonText}
        </button>
    `;

    navigationArea.innerHTML = `${backButtonHtml}${primaryButtonHtml}`;
}

// Funções de Navegação (MODIFICADAS para incluir parada de áudio)
function navigateBack() {
    pararLeitura(); 
    if (currentBlock > 0) {
        currentBlock--;
        renderBlock();
    }
}

function navigateNext() {
    pararLeitura(); 
    // Verifica o estado de conclusão para garantir que todas as perguntas foram respondidas
    const isComplete = checkBlockCompletionState();
    
    if (isComplete) {
        const totalBlocks = Math.ceil(shuffledQuestions.length / QUESTIONS_PER_BLOCK);
        if (currentBlock < totalBlocks - 1) {
            currentBlock++;
            renderBlock();
        }
    } else {
        validationMessage.style.display = 'block';
    }
}

function finishQuiz() {
    pararLeitura(); 
    const totalQuestions = shuffledQuestions.length;
    quizContent.innerHTML = `
        <h2>Resultado Final do Quiz</h2>
        <p class="score-summary">Total de Perguntas: <strong>${totalQuestions}</strong></p>
        <p class="score-summary" style="color: var(--success-color);">Acertos Totais: <strong>${totalHits}</strong></p>
        <p class="score-summary" style="color: var(--danger-color);">Erros Totais: <strong>${totalErrors}</strong></p>
        <p class="score-summary">Aproveitamento: <strong>${((totalHits / totalQuestions) * 100).toFixed(2)}%</strong></p>
        <p class="motivation-message" style="font-size: 1.2em;">${motivationMessages[motivationMessages.length - 1]} Prepare-se para o próximo desafio!</p>
        
        <div class="final-buttons">
            <button class="nav-button try-again" onclick="startQuiz()">Tentar Novamente</button>
            <button class="nav-button exit-button" onclick="exitQuiz()">Sair do Quiz</button>
        </div>
    `;
    navigationArea.style.display = 'none';
    resultsArea.style.display = 'none';
    quizSubtitle.textContent = 'Quiz Finalizado';
}

function exitQuiz() {
    pararLeitura(); 
    const confirmExit = confirm("Tem certeza que deseja sair do quiz? Seu progresso será perdido, mas o placar atual será exibido.");

    if (confirmExit) {
        const totalAnswered = Object.keys(userAnswers).length;
        const totalQuestions = shuffledQuestions.length;
        const totalPercentage = ((totalHits / totalQuestions) * 100).toFixed(2);
        
        quizContent.innerHTML = `
            <div class="exit-screen">
                <h2>Saída Antecipada</h2>
                <p>Você respondeu **${totalAnswered}** de ${totalQuestions} perguntas.
