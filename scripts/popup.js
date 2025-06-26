document.addEventListener("DOMContentLoaded", () => {
  const progressBar = document.getElementById("progressBar");
  const popupTitle = document.getElementById("popupTitle");
  const generateBtn = document.getElementById("generateBtn");
  const quizContainer = document.getElementById("quizContainer");
  const resultEl = document.getElementById("result");
  const explanationBtn = document.getElementById("explanation");

  let btnClicked = false;

  // Show progress bar and animate width
  function startProgressBar() {
    progressBar.style.width = "0%";
    progressBar.style.display = "block";

    let width = 0;
    progressBar._interval = setInterval(() => {
      if (width < 90) {
        width += 5;
        progressBar.style.width = width + "%";
      }
    }, 100);
  }

  // Complete progress bar
  function completeProgressBar() {
    clearInterval(progressBar._interval);
    progressBar.style.width = "100%";
    setTimeout(() => {
      progressBar.style.display = "none";
      progressBar.style.width = "0%";
    }, 300);
  }




  generateBtn.addEventListener("click", () => {
    startProgressBar();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "getVideoContext" }, (response) => {
        if (!response) {
          quizContainer.innerText = "Could not fetch video context.";
          return;
        }

        const { videoTitle, url, timestamp } = response;
        console.log("Video Title:", videoTitle);
        console.log("URL:", url);
        console.log("Timestamp:", timestamp);

        // Send to background for Gemini processing
        chrome.runtime.sendMessage(
          {
            type: "finalizeVideoData",
            data: { videoTitle, url, timestamp },
          },
          (response) => {
            if (response && response.quiz) {
              renderQuiz(response.quiz); // your existing function
            } else {
              quizContainer.innerText = "No quiz received or error occurred.";
            }
          }
        );
      });
    });
  });



  function renderQuiz(rawResponse) {
    try {
      const jsonString = rawResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const quiz = JSON.parse(jsonString);
      console.log(quiz);
      quizContainer.innerHTML = `<h3>${quiz.quizTitle}</h3>`;
      quizContainer.style.display = "flex";
      quizContainer.style.flexDirection = "column";
      resultEl.innerHTML = "";

      quiz.questions.forEach((q, idx) => {
        const questionBlock = document.createElement("div");
        questionBlock.className = "quiz-card";

        const questionEl = document.createElement("p");
        questionEl.className = "question-text";
        questionEl.innerHTML = `<strong>Q${idx + 1}:</strong> ${q.question}`;
        questionBlock.appendChild(questionEl);

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
        quizContainer.appendChild(questionBlock);
      });

      const submitBtn = document.createElement("button");
      submitBtn.className = "btn";
      submitBtn.textContent = "Submit Quiz";
      submitBtn.onclick = () => scoreQuiz(quiz);
      quizContainer.appendChild(submitBtn);
      generateBtn.style.display = "none";
      popupTitle.textContent = "Take your Quiz!";
      completeProgressBar();
    } catch (err) {
      console.error("Error parsing quiz JSON:", err);
      quizContainer.style.display = "flex";
      quizContainer.innerText = "Quiz format error: response is not valid JSON.";
    }
  }

  function scoreQuiz(quiz) {
    const submitBtn = document.querySelector(".btn");
    const loader = document.getElementById("loader");

    let failedList = [];
    let score = 0;
    let unanswered = 0;

    if (submitBtn) submitBtn.style.display = "none";
    loader.style.display = "block";

    setTimeout(() => {
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

      resultEl.textContent =
        unanswered > 0
          ? `You left ${unanswered} unanswered. Score: ${score} / ${quiz.questions.length}`
          : `Score: ${score} / ${quiz.questions.length}`;

      loader.style.display = "none";
      explanationBtn.style.display = "flex";
      explanationBtn.onclick = () => loadExplanation(quiz, failedList);
    }, 1000);
  }

  function loadExplanation(quiz, failedList) {
    const explanationContainer = document.getElementById("explanation-container");
    explanationContainer.innerHTML = "";
    const loader = document.getElementById("loader");

    loader.style.display = "block";

    setTimeout(() => {
      failedList.forEach((idx) => {
        const explainationsCard = document.createElement("div");
        explainationsCard.className = "explanation-card";

        const question = document.createElement("p");
        question.innerHTML = `<strong>Q${idx + 1}:</strong> ${quiz.questions[idx].question}`;

        const correctAnswer = document.createElement("p");
        correctAnswer.className = "correct-answer";
        correctAnswer.textContent = `Correct Answer: ${quiz.questions[idx].answer}`;

        const explainationText = document.createElement("p");
        explainationText.className = "explaination-text";
        explainationText.textContent = `Explanation: ${quiz.questions[idx].explanation}`;

        explainationsCard.appendChild(question);
        explainationsCard.appendChild(correctAnswer);
        explainationsCard.appendChild(explainationText);

        explanationContainer.appendChild(explainationsCard);
      });

      loader.style.display = "none";
      explanationContainer.style.display = "flex";
    }, 800);
  }
});
