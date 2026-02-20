/**
 * DATAHORSE SURVEY WIDGET - PESI STYLE
 * Questions appear directly on scroll, no start button
 */

(function() {
  'use strict';

  const DEFAULT_CONFIG = {
    apiBase: window.location.origin.includes('localhost') 
      ? 'http://localhost:8000/api' 
      : '/api',
    mode: 'full',
    element: null,
    slug: null,
    onComplete: null,
    showBranding: false
  };

  class DatahorseSurvey {
    constructor(config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.survey = null;
      this.currentQuestionIndex = 0;
      this.answers = {};
      this.container = null;
      this.state = 'loading';
    }

    async init() {
      if (typeof this.config.element === 'string') {
        this.container = document.querySelector(this.config.element);
      } else if (this.config.element instanceof HTMLElement) {
        this.container = this.config.element;
      }

      if (!this.container) {
        console.error('[DatahorseSurvey] Container element not found');
        return;
      }

      this.container.classList.add('dh-survey-widget', `dh-mode-${this.config.mode}`);
      this.loadCSS();

      if (this.config.mode === 'modal') {
        this.createModalOverlay();
      }

      await this.loadSurvey();
    }

    loadCSS() {
      if (document.querySelector('link[href*="survey-widget.css"]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = this.config.apiBase.replace('/api', '') + '/static/surveys/survey-widget.css';
      document.head.appendChild(link);
    }

    createModalOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'dh-survey-modal-overlay';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
      
      document.body.appendChild(overlay);
      overlay.appendChild(this.container);
      this.addCloseButton();
    }

    addCloseButton() {
      const btn = document.createElement('button');
      btn.className = 'dh-modal-close';
      btn.innerHTML = '✕';
      btn.addEventListener('click', () => this.closeModal());
      this.container.style.position = 'relative';
      this.container.insertBefore(btn, this.container.firstChild);
    }

    closeModal() {
      const overlay = document.querySelector('.dh-survey-modal-overlay');
      if (overlay) overlay.remove();
    }

    async loadSurvey() {
      try {
        const res = await fetch(`${this.config.apiBase}/public/surveys/${this.config.slug}/`);
        if (!res.ok) throw new Error('Survey not found');
        this.survey = await res.json();
        this.state = 'question'; // GO STRAIGHT TO QUESTIONS - NO WELCOME
        this.render();
      } catch (err) {
        this.state = 'error';
        this.render();
      }
    }

    render() {
      switch (this.state) {
        case 'loading':
          this.renderLoading();
          break;
        case 'question':
          this.renderQuestion();
          break;
        case 'results':
          this.renderResults();
          break;
        case 'error':
          this.renderError();
          break;
      }
    }

    renderLoading() {
      this.container.innerHTML = `
        <div class="dh-survey-card">
          <div class="dh-loading">
            <div class="dh-spinner"></div>
            <div class="dh-loading-text">Loading survey...</div>
          </div>
        </div>
      `;
    }

    renderQuestion() {
      const question = this.survey.questions[this.currentQuestionIndex];
      const total = this.survey.questions.length;
      const progress = Math.round(((this.currentQuestionIndex + 1) / total) * 100);
      const isLast = this.currentQuestionIndex === total - 1;
      const canGoBack = this.currentQuestionIndex > 0;
      const savedAnswer = this.answers[question.id];

      // Show title and description ONLY on first question
      const showHeader = this.currentQuestionIndex === 0;

      this.container.innerHTML = `
        <div class="dh-survey-card">
          ${showHeader ? `
            <div class="dh-card-body" style="border-bottom: 1px solid #E2E8F0;">
              <h1 class="dh-survey-title">${this.escapeHtml(this.survey.title)}</h1>
              ${this.survey.description ? `<p class="dh-survey-description">${this.escapeHtml(this.survey.description)}</p>` : ''}
            </div>
          ` : ''}
          ${this.config.mode !== 'sidebar' ? `
            <div class="dh-card-body" style="padding-bottom: 1.5rem;">
              <div class="dh-progress-wrap">
                <div class="dh-progress-label">
                  <span>Question ${this.currentQuestionIndex + 1} of ${total}</span>
                  <span class="dh-progress-pct">${progress}%</span>
                </div>
                <div class="dh-progress-track">
                  <div class="dh-progress-fill" style="width: ${progress}%"></div>
                </div>
              </div>
            </div>
          ` : ''}
          <div class="dh-card-body">
            ${question.heading ? `<div class="dh-question-heading">${this.escapeHtml(question.heading)}</div>` : ''}
            <h2 class="dh-question-text">
              ${this.escapeHtml(question.text)}
              ${question.is_required ? '<span class="dh-required-mark">*</span>' : ''}
            </h2>
            ${this.renderQuestionInput(question, savedAnswer)}
          </div>
          <div class="dh-card-footer">
            <div class="dh-footer-left">
              ${canGoBack ? '<button class="dh-btn dh-btn-outline" id="dh-back-btn">← Back</button>' : ''}
            </div>
            <div class="dh-footer-right">
              ${!question.is_required ? '<span class="dh-optional-label">Optional</span>' : ''}
              <button class="dh-btn dh-btn-primary" id="dh-next-btn" ${question.is_required ? 'disabled' : ''}>
                ${isLast ? 'Submit ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      `;

      this.attachQuestionListeners(question, isLast);
    }

    renderQuestionInput(question, savedAnswer) {
      if (question.question_type === 'single') {
        return `
          <div class="dh-choice-options" id="dh-question-input">
            ${question.options.map(opt => `
              <div class="dh-choice-option ${savedAnswer === opt.id ? 'dh-selected' : ''}" data-option-id="${opt.id}">
                <div class="dh-choice-radio"></div>
                <span class="dh-choice-label">${this.escapeHtml(opt.text)}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else if (question.question_type === 'multiple') {
        const selected = Array.isArray(savedAnswer) ? savedAnswer : [];
        return `
          <div class="dh-multi-hint">Select all that apply</div>
          <div class="dh-choice-options" id="dh-question-input">
            ${question.options.map(opt => `
              <div class="dh-choice-option ${selected.includes(opt.id) ? 'dh-selected' : ''}" data-option-id="${opt.id}">
                <div class="dh-choice-checkbox">${selected.includes(opt.id) ? '✓' : ''}</div>
                <span class="dh-choice-label">${this.escapeHtml(opt.text)}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        return `
          <textarea class="dh-open-text" id="dh-question-input" placeholder="Type your answer here...">${savedAnswer || ''}</textarea>
        `;
      }
    }

    attachQuestionListeners(question, isLast) {
      const nextBtn = document.getElementById('dh-next-btn');
      const backBtn = document.getElementById('dh-back-btn');
      const input = document.getElementById('dh-question-input');

      const updateNextButton = () => {
        if (!question.is_required) {
          nextBtn.disabled = false;
          return;
        }

        let hasAnswer = false;
        if (question.question_type === 'text') {
          hasAnswer = input.value.trim().length > 0;
        } else {
          hasAnswer = this.answers[question.id] !== undefined && 
                     (Array.isArray(this.answers[question.id]) ? this.answers[question.id].length > 0 : true);
        }
        nextBtn.disabled = !hasAnswer;
      };

      if (question.question_type === 'single') {
        const options = input.querySelectorAll('.dh-choice-option');
        options.forEach(opt => {
          opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('dh-selected'));
            opt.classList.add('dh-selected');
            this.answers[question.id] = parseInt(opt.dataset.optionId);
            updateNextButton();
          });
        });
      }

      if (question.question_type === 'multiple') {
        const options = input.querySelectorAll('.dh-choice-option');
        if (!Array.isArray(this.answers[question.id])) {
          this.answers[question.id] = [];
        }
        options.forEach(opt => {
          opt.addEventListener('click', () => {
            const id = parseInt(opt.dataset.optionId);
            const idx = this.answers[question.id].indexOf(id);
            if (idx > -1) {
              this.answers[question.id].splice(idx, 1);
              opt.classList.remove('dh-selected');
              opt.querySelector('.dh-choice-checkbox').textContent = '';
            } else {
              this.answers[question.id].push(id);
              opt.classList.add('dh-selected');
              opt.querySelector('.dh-choice-checkbox').textContent = '✓';
            }
            updateNextButton();
          });
        });
      }

      if (question.question_type === 'text') {
        input.addEventListener('input', (e) => {
          this.answers[question.id] = e.target.value;
          updateNextButton();
        });
      }

      nextBtn.addEventListener('click', () => {
        if (isLast) {
          this.submitSurvey();
        } else {
          this.currentQuestionIndex++;
          this.render();
        }
      });

      if (backBtn) {
        backBtn.addEventListener('click', () => {
          this.currentQuestionIndex--;
          this.render();
        });
      }

      updateNextButton();
    }

    async submitSurvey() {
      const payload = {
        answers: this.survey.questions.map(q => {
          const answer = this.answers[q.id];
          if (q.question_type === 'text') {
            return {
              question_id: q.id,
              text_answer: answer || '',
              option_ids: []
            };
          } else if (q.question_type === 'multiple') {
            return {
              question_id: q.id,
              option_ids: Array.isArray(answer) ? answer : [],
              text_answer: ''
            };
          } else {
            return {
              question_id: q.id,
              option_ids: answer ? [answer] : [],
              text_answer: ''
            };
          }
        })
      };

      try {
        const res = await fetch(`${this.config.apiBase}/public/surveys/${this.config.slug}/submit/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.detail && data.detail.includes('already submitted')) {
            await this.loadResults();
          } else {
            throw new Error('Submission failed');
          }
        } else {
          await this.loadResults();
        }

        if (this.config.onComplete) {
          this.config.onComplete(this.survey);
        }
      } catch (err) {
        alert('Failed to submit survey. Please try again.');
      }
    }

    async loadResults() {
      try {
        const res = await fetch(`${this.config.apiBase}/surveys/${this.config.slug}/results/`);
        if (!res.ok) throw new Error('Results not available');
        this.results = await res.json();
        this.state = 'results';
        this.render();
      } catch (err) {
        this.state = 'results';
        this.results = null;
        this.render();
      }
    }

    renderResults() {
      if (!this.results) {
        this.container.innerHTML = `
          <div class="dh-survey-card">
            <div class="dh-card-body">
              <div class="dh-thank-you">
                <div class="dh-thank-you-icon">✓</div>
                <div>
                  <div class="dh-thank-you-title">Thank you for your response!</div>
                  <div class="dh-thank-you-sub">Your feedback has been recorded.</div>
                </div>
              </div>
            </div>
          </div>
        `;
        return;
      }

      const resultsHtml = this.results.results.map((q, i) => {
        if (q.question_type === 'text') {
          return `
            <div class="dh-result-block">
              ${q.heading ? `<div class="dh-result-q-heading">${this.escapeHtml(q.heading)}</div>` : ''}
              <div class="dh-result-q-text">${this.escapeHtml(q.text)}</div>
              <div class="dh-open-note">
                Open text responses are reviewed privately.
              </div>
            </div>
          `;
        } else {
          return `
            <div class="dh-result-block">
              ${q.heading ? `<div class="dh-result-q-heading">${this.escapeHtml(q.heading)}</div>` : ''}
              <div class="dh-result-q-text">${this.escapeHtml(q.text)}</div>
              <div class="dh-bar-chart">
                ${q.options.map((opt, j) => `
                  <div class="dh-bar-row">
                    <div class="dh-bar-label-row">
                      <span class="dh-bar-option">${this.escapeHtml(opt.text)}</span>
                      <span class="dh-bar-pct">${opt.percent}%</span>
                    </div>
                    <div class="dh-bar-track">
                      <div class="dh-bar-fill dh-color-${(j % 5) + 1}" style="width: ${opt.percent}%"></div>
                    </div>
                    <div class="dh-bar-count">${opt.count} response${opt.count !== 1 ? 's' : ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }).join('');

      this.container.innerHTML = `
        <div class="dh-thank-you">
          <div class="dh-thank-you-icon">✓</div>
          <div>
            <div class="dh-thank-you-title">Thank you for your response!</div>
            <div class="dh-thank-you-sub">Here's how ${this.results.total_responses} ${this.results.total_responses === 1 ? 'person' : 'people'} answered</div>
          </div>
        </div>
        <div class="dh-survey-card">
          <div class="dh-card-body">
            <div class="dh-results-title">Survey Results — ${this.results.total_responses} total responses</div>
            ${resultsHtml}
          </div>
        </div>
      `;
    }

    renderError() {
      this.container.innerHTML = `
        <div class="dh-survey-card">
          <div class="dh-error">
            <div class="dh-error-icon">🔍</div>
            <div class="dh-error-title">Survey not found</div>
            <div class="dh-error-text">This survey may have been closed or the link is incorrect.</div>
          </div>
        </div>
      `;
    }

    escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    }
  }

  window.DatahorseSurvey = {
    init: function(config) {
      const widget = new DatahorseSurvey(config);
      widget.init();
      return widget;
    }
  };
})();