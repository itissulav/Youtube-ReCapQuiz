function insertVideoPlayerButton() {
  const interval = setInterval(() => {
    const controls = document.querySelector(".ytp-right-controls");

    if (controls && !document.getElementById("my-extension-button")) {
      clearInterval(interval);

      const button = document.createElement("button");
      button.id = "my-extension-button";
      button.className = "ytp-button ytp-autonav-button";
      button.title = "Generate Quiz";
      button.innerHTML = "Quiz →";
      button.style.verticalAlign = "text-bottom";
      button.style.textAlign = "center";
      button.style.color = "white";
      button.style.marginRight = "1.5rem";
      button.style.borderRadius = "10px";
      button.style.opacity = "90%";
      button.style.fontWeight = "700";

      button.onclick = () => {
        const title = document.title.replace(" - YouTube", "").trim();
        const url = window.location.href;
        const player = document.querySelector("video");
        const timestamp = player ? Math.floor(player.currentTime) : 0;

        showLoadingPanel();

        chrome.runtime.sendMessage(
          {
            type: "finalizeVideoData",
            data: { videoTitle: title, url: url, timestamp: timestamp },
          },
          (response) => {
            if (response && response.quiz) {
              injectQuizUI(response.quiz);
            } else {
              showErrorPanel("No quiz received or error occurred.");
            }
          }
        );
      };

      controls.insertBefore(button, controls.firstChild);
    }
  }, 500);
}

function showLoadingPanel() {
  const existing = document.getElementById("youtube-quiz-panel");
  if (existing) existing.remove();

  const sidebar = document.querySelector("#secondary-inner");
  if (!sidebar) return;

  const quizPanel = document.createElement("div");
  quizPanel.id = "youtube-quiz-panel";

  quizPanel.style.cssText = `
    background-color: #181818;
    color: #fff;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
    max-height: 700px;
    overflow-y: auto;
    font-family: 'Roboto', Arial, sans-serif;
    font-size: 14px;
    margin-bottom: 2rem;
  `;

  quizPanel.innerHTML = `
    <div id="quiz-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <span style="font-weight: 600;">YouTube Quiz</span>
      <div>
        <button id="minimize-btn" style="margin-right: 8px; background: none; color: white; border: none; font-size: 16px; cursor: pointer;">—</button>
        <button id="close-btn" style="background: none; color: white; border: none; font-size: 16px; cursor: pointer;">✕</button>
      </div>
    </div>
    <div id="quiz-panel-content">
      <div class="loading-bar-container" style="position: relative; width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden; margin-top: 10px;">
        <div class="loading-bar" style="position: absolute; height: 100%; width: 30%; background: #cc0000; animation: loadingBarMove 1.5s linear infinite;"></div>
      </div>
      <p style="margin-top: 10px;">Generating Quiz...</p>
    </div>
  `;

  sidebar.prepend(quizPanel);

  document.getElementById("close-btn").onclick = () => quizPanel.remove();

  document.getElementById("minimize-btn").onclick = () => {
    const content = document.getElementById("quiz-panel-content");
    const isMinimized = quizPanel.getAttribute("data-minimized") === "true";
    content.style.display = isMinimized ? "" : "none";
    quizPanel.setAttribute("data-minimized", !isMinimized);
  };

  if (!document.getElementById("quiz-loading-style")) {
    const style = document.createElement("style");
    style.id = "quiz-loading-style";
    style.textContent = `
      @keyframes loadingBarMove {
        0% { left: -30%; }
        100% { left: 100%; }
      }
    `;
    document.head.appendChild(style);
  }
}

function showErrorPanel(msg) {
  const content = document.querySelector("#quiz-panel-content");
  if (content) content.innerHTML = `<p>${msg}</p>`;
}

function injectQuizUI(rawResponse) {
  const quizPanel = document.getElementById("youtube-quiz-panel");
  const content = quizPanel?.querySelector("#quiz-panel-content");
  if (!quizPanel || !content) return;

  content.innerHTML = "";
  content.style.display = "flex";
  content.style.flexDirection = "column";

  let quizLoaded = false;
  let quiz = null;

  try {
    const jsonString = rawResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    quiz = JSON.parse(jsonString);
    quizLoaded = true;
  } catch (err) {
    console.error("Error parsing quiz JSON: ", err);
  }

  if (quizLoaded) {
    const titleEl = document.createElement("h3");
    titleEl.style.marginBottom = "2rem";
    titleEl.textContent = quiz.quizTitle;
    content.appendChild(titleEl);

    quiz.questions.forEach((q, idx) => {
      const questionBlock = document.createElement("div");
      questionBlock.className = "quiz-card";

      const questionE1 = document.createElement("p");
      questionE1.className = "question-text";
      questionE1.innerHTML = `<strong>Q${idx + 1}:</strong> ${q.question}`;
      questionBlock.appendChild(questionE1);

      const optionsDiv = document.createElement("div");
      optionsDiv.className = "options";

      q.options.forEach((opt) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q${idx}`;
        input.value = opt.split(".")[0].trim();
        label.appendChild(input);
        label.append(` ${opt}`);
        optionsDiv.appendChild(label);
      });

      questionBlock.appendChild(optionsDiv);
      content.appendChild(questionBlock);
    });

    const submitBtn = document.createElement("button");
    submitBtn.className = "btn";
    submitBtn.textContent = "Submit";
    submitBtn.onclick = () => scoreQuiz(quiz, submitBtn, content);
    content.appendChild(submitBtn);
  } else {
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "There was an Error in format. Please reload the video and try again";
    content.appendChild(errorMessage);
  }

  const style = document.createElement("style");
  style.textContent = `
    #youtube-quiz-panel, #youtube-quiz-panel * {
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 14px;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    #youtube-quiz-panel .quiz-card {
      background-color: #282828;
      color: #ddd;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.05);
    }

    #youtube-quiz-panel .question-text {
      font-weight: 500;
      font-size: 15px;
    }

    #youtube-quiz-panel .options label {
      display: block;
      margin-bottom: 8px;
      cursor: pointer;
      color: #ddd;
      user-select: none;
    }

    #youtube-quiz-panel .options input[type="radio"] {
      margin-right: 8px;
      accent-color: #cc0000;
      cursor: pointer;
    }

    #youtube-quiz-panel button.btn {
      background-color: #cc0000;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      align-self: flex-start;
      margin-top: 10px;
    }

    #youtube-quiz-panel button.btn:hover {
      background-color: #e60000;
    }

    #youtube-quiz-panel p.correct-answer {
      color: #0f9d58;
      font-weight: 600;
    }

    #youtube-quiz-panel p.explaination-text {
      color: #bbb;
      font-style: italic;
    }

    #youtube-quiz-panel .explanation-card {
      background-color: #212121;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 12px;
      color: #ccc;
    }

    .quiz-loading-bar {
      height: 100%;
      width: 40%;
      background: linear-gradient(to right, #cc0000, #ff4444);
      animation: slide 1s linear infinite;
      border-radius: 6px;
    }

    @keyframes slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }
  `;
  document.head.appendChild(style);
}

function scoreQuiz(quiz, submitBtn, panel) {
  let failedList = [];
  let score = 0;
  let unanswered = 0;

  if (submitBtn) submitBtn.style.display = "none";

  quiz.questions.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="q${idx}"]:checked`);
    if (!selected) {
      unanswered++;
      failedList.push(idx);
    } else {
      if (selected.value === q.answer) {
        score++;
      } else {
        failedList.push(idx);
      }
    }
  });

  const resultE1 = document.createElement("p");
  resultE1.textContent =
    unanswered > 0
      ? `You left ${unanswered} unanswered. Score: ${score} / ${quiz.questions.length}`
      : `Score: ${score} / ${quiz.questions.length}`;
  resultE1.style.marginBottom = "16px";
  panel.appendChild(resultE1);

  const explanationButton = document.createElement("button");
  explanationButton.className = "btn explainationBtn";
  explanationButton.textContent = "Explanations ↓";
  explanationButton.onclick = () => loadExplainations(quiz, failedList, panel);
  panel.appendChild(explanationButton);
}

function loadExplainations(quiz, failedList, quizPanel) {
  failedList.forEach((idx) => {
    const explanationCard = document.createElement("div");
    explanationCard.className = "explanation-card";

    const question = document.createElement("p");
    question.innerHTML = `<strong>Q${idx + 1}:</strong> ${quiz.questions[idx].question}`;

    const correctAnswer = document.createElement("p");
    correctAnswer.className = "correct-answer";
    correctAnswer.textContent = `Correct Answer: ${quiz.questions[idx].answer}`;

    const explanationText = document.createElement("p");
    explanationText.className = "explaination-text";
    explanationText.textContent = `Explanation: ${quiz.questions[idx].explanation}`;

    explanationCard.appendChild(question);
    explanationCard.appendChild(correctAnswer);
    explanationCard.appendChild(explanationText);

    quizPanel.appendChild(explanationCard);
  });
}

insertVideoPlayerButton();
