import { BaseDecoration, Category, Kind, SyntaxError, UnhandledError, contextKeywords, decorations, indentCount, keywords, kindOfKeywordOrModifier, operators } from "./convert";
import { debounce, repaint, findLast, findLastIndex } from "./functions";

export type { BaseToken };


const SELECTION_COLOR_ID = 'selection';

let isLatestCopyNotSelected: false | string = false;
const splitByLineBreak = /\r\n|\r|\n/;

class Pane {
  private constructor() {
    document.getElementById('editorSpace')!.style.gridTemplateColumns = `repeat(${panes.length + 1}, calc(100% / ${panes.length + 1}))`;

    const element = (document.getElementById('paneTemplate')! as HTMLTemplateElement).content.firstElementChild!.cloneNode(true) as HTMLElement;
    element.id = 'pane' + this.paneId.toString();
    document.getElementById('editorSpace')!.appendChild(element);

    this.decorationsData = new DecorationsData();
    this.caret = new Caret(this.paneId, this.decorationsData);
    this.lines = new Lines(this.paneId, this.caret, this.decorationsData);
    this.caret.lines = this.lines;

    this.lines.appendLine();
    this.caret.set(0, 0);
  }

  public static create(selectNewPane = true) {
    const pane = new Pane();
    panes.push(pane);
    if (selectNewPane)
      selectedPaneId = pane.paneId;
    else
      pane.caret.hide();
    return pane;
  }

  public delete() {
    if (panes.length === 1) return;
    document.getElementById('pane' + this.paneId.toString())!.remove();
    panes.splice(panes.findIndex(pane => pane.paneId === this.paneId), 1);
    document.getElementById('editorSpace')!.style.gridTemplateColumns = `repeat(${panes.length}, calc(100% / ${panes.length}))`;
  }

  private static lastPaneId = 0;

  public readonly paneId = Pane.lastPaneId++;

  decorationsData: DecorationsData;
  caret: Caret;
  lines: Lines;

  repeatActionTimeout: number | null = null;
  repeatActionInterval: number | null = null;

  keyDown(e: KeyboardEvent) {
    if (!e.metaKey) {
      switch (e.key) {
        case 'F10': {
          panes.find(pane => pane.paneId === selectedPaneId)!.caret.hide();
          Pane.create();
          return;
        }
        case 'ArrowLeft':
        case 'ArrowRight':
          // repeatAction(this.repeatActionTimeout, this.repeatActionInterval, () => {
          if (e.altKey) {
          } else {
            const left = this.caret.rangeStart === null ? this.caret.left : this.caret.rangeStart.left;
            const top = this.caret.rangeStart === null ? this.caret.top : this.caret.rangeStart.top;
            if (this.caret.rangeStart === null || e.shiftKey) {
              if (e.key === 'ArrowLeft')
                this.caret.moveLeft();
              else
                this.caret.moveRight();
            } else {
              if (e.key === 'ArrowLeft') {
                if (this.caret.top >= this.caret.rangeStart.top && (this.caret.top !== this.caret.rangeStart.top || this.caret.left >= this.caret.rangeStart.left))
                  this.caret.set(this.caret.rangeStart.left, this.caret.rangeStart.top);
              } else {
                if (this.caret.top <= this.caret.rangeStart.top && (this.caret.top !== this.caret.rangeStart.top || this.caret.left <= this.caret.rangeStart.left))
                  this.caret.set(this.caret.rangeStart.left, this.caret.rangeStart.top);
              }
            }
            if (e.shiftKey)
              this.caret.changeSelection(left, top);
            else
              this.caret.clearSelection();
          }
          // });
          return;
        case 'ArrowUp':
        case 'ArrowDown':
          // repeatAction(this.repeatActionTimeout, this.repeatActionInterval, () => {
          if (e.altKey) {
            if (this.caret.rangeStart !== null) {
              const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
              const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
              if ((e.key === 'ArrowUp' && start.top > 0) || (e.key === 'ArrowDown' && end.top < this.lines.lines.length - 1)) {
                this.lines.swapLine(start.top, end.top - start.top + 1, e.key === 'ArrowUp');
                this.caret.set(this.caret.left, this.caret.top + (e.key === 'ArrowUp' ? -1 : 1));
                this.caret.changeSelection(this.caret.rangeStart.left, this.caret.rangeStart.top + (e.key === 'ArrowUp' ? -1 : 1));
              }
              return;
            }
            if ((e.key === 'ArrowUp' && this.caret.top > 0) || (e.key === 'ArrowDown' && this.caret.top < this.lines.lines.length - 1)) {
              this.lines.swapLine(this.caret.top, 1, e.key === 'ArrowUp');
              this.caret.set(this.caret.left, this.caret.top + (e.key === 'ArrowUp' ? -1 : 1));
            }
          } else {
            const left = this.caret.rangeStart === null ? this.caret.left : this.caret.rangeStart.left;
            const top = this.caret.rangeStart === null ? this.caret.top : this.caret.rangeStart.top;
            if (e.key === 'ArrowUp')
              this.caret.moveUp();
            else
              this.caret.moveDown();
            if (e.shiftKey)
              this.caret.changeSelection(left, top);
            else
              this.caret.clearSelection();
          }
          // });
          return;
        case 'Enter':
          if (e.ctrlKey) {
            if (e.shiftKey) {
              const start = this.caret.rangeStart === null ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top > this.caret.top ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top === this.caret.top ? (this.caret.rangeStart.left > this.caret.left ? { left: this.caret.left, top: this.caret.top } : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }) : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }));
              this.caret.clearSelection();
              if (start.top === 0) {
                this.lines.insertLine(0);
                this.caret.set(0, 0);
              } else {
                this.lines.insertLine(start.top);
                this.caret.set(0, start.top);
              }
            } else {
              const end = this.caret.rangeStart === null ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top < this.caret.top ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top === this.caret.top ? (this.caret.rangeStart.left < this.caret.left ? { left: this.caret.left, top: this.caret.top } : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }) : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }));
              this.caret.clearSelection();
              this.lines.insertLine(end.top + 1);
              this.caret.set(0, end.top + 1);
            }
          } else {
            if (this.caret.rangeStart !== null) {
              const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
              const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
              this.caret.clearSelection();
              this.caret.set(start.left, start.top);
              this.lines.deleteRange(start, end);
            }
            this.lines.lines[this.caret.top].startNewLine(this.caret.left);
          }
          return;
        case 'Backspace':
          if (this.caret.rangeStart !== null) {
            const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
            const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
            this.caret.clearSelection();
            this.caret.set(start.left, start.top);
            this.lines.deleteRange(start, end);
          } else {
            const topTemp = this.caret.top;
            const leftTemp = this.caret.left;
            this.caret.moveLeft();
            this.lines.lines[topTemp].deleteText(leftTemp - 1, 1);
          }
          return;
        case 'Delete':
          if (!e.shiftKey) {
            if (this.caret.rangeStart !== null) {
              const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
              const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
              this.caret.clearSelection();
              this.caret.set(start.left, start.top);
              this.lines.deleteRange(start, end);
            } else {
              this.lines.lines[this.caret.top].deleteText(this.caret.left, 1);
            }
          }
          return;
        case 'Tab':
          if (this.caret.rangeStart !== null) {
            const leftTemp = this.caret.left;
            const topTemp = this.caret.top;
            const leftRangeTemp = this.caret.rangeStart.left;
            const topRangeTemp = this.caret.rangeStart.top;

            const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
            const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;

            this.caret.clearSelection();
            for (let i = start.top; i <= end.top; i++) {
              this.lines.lines[i].insertText(' '.repeat(indentCount), 0);
            }
            this.caret.set(leftTemp + indentCount, topTemp);
            this.caret.changeSelection(leftRangeTemp + indentCount, topRangeTemp);
          } else {
            this.lines.lines[this.caret.top].insertText(' '.repeat(indentCount), this.caret.left);
            this.caret.set(this.caret.left + indentCount, this.caret.top);
          }
          return;
      }
    }
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
      if (this.caret.rangeStart !== null) {
        const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
        const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
        this.caret.clearSelection();
        this.lines.deleteRange(start, end);
        this.lines.lines[start.top].insertText(e.key, start.left);
        this.caret.set(start.left + 1, start.top);
      } else {
        this.lines.lines[this.caret.top].insertText(e.key, this.caret.left);
        this.caret.moveRight();
      }
    } else if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      if (e.key === 'v') {
        navigator.clipboard.readText().then(async text => {
          if (text === '')
            return;

          if (text === isLatestCopyNotSelected) {
            const lengthTemp = this.lines.lines[this.caret.top].length;
            this.lines.lines[this.caret.top].insertText(text.slice(0, -2), 0);
            this.lines.lines[this.caret.top].startNewLine(text.length - 2);
            this.caret.set(lengthTemp, this.caret.top);
            return;
          }

          let dialog: Dialog | null = null;
          if (text.length > 1000) {
            dialog = new Dialog('貼り付け中', 'テキストをクリップボードから貼り付け中です。しばらくお待ちください。', []);
            await dialog.show();
          }

          if (this.caret.rangeStart !== null) {
            const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
            const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
            this.caret.clearSelection();
            this.caret.set(start.left, start.top);
            this.lines.deleteRange(start, end);
          }

          const split = text.split(splitByLineBreak);
          if (split.length === 1) {
            this.lines.lines[this.caret.top].insertText(text, this.caret.left);
            this.caret.set(this.caret.left + text.length, this.caret.top);
          } else {
            const textTemp = this.lines.lines[this.caret.top].text.slice(this.caret.left);

            this.lines.lines[this.caret.top].deleteText(this.caret.left, textTemp.length);
            this.lines.lines[this.caret.top].insertText(split[0], this.caret.left);

            let top = this.caret.top + 1;

            for (let i = 1; i < split.length - 1; i++) {
              this.lines.insertLine(top, split[i]);
              top++;
            }

            this.lines.insertLine(top, split[split.length - 1] + textTemp);

            for (let i = top + 1; i < this.lines.lines.length; i++) {
              this.lines.lines[i].leftOfTokensOffset += split.reduce((a, b) => a + b.length, 0) - split[0].length + textTemp.length;
            }

            this.caret.set(split[split.length - 1].length, top);
          }

          dialog?.hide();
        });
      } else if (e.key === 'c' || e.key === 'x') {
        let text: string;
        if (this.caret.rangeStart !== null) {
          const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
          const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;

          if (start.top === end.top) {
            text = this.lines.lines[start.top].text.slice(start.left, end.left);
          } else {
            text = this.lines.lines[start.top].text.slice(start.left) + (start.top === end.top - 1 ? '\r\n' : '\r\n' + this.lines.lines.slice(start.top + 1, end.top).map(line => line.text).join('\r\n') + '\r\n') + this.lines.lines[end.top].text.slice(0, end.left);
          }
          isLatestCopyNotSelected = false;

          if (e.key === 'x') {
            this.caret.clearSelection();
            this.caret.set(start.left, start.top);
            this.lines.deleteRange(start, end);
          }
        } else {
          text = this.lines.lines[this.caret.top].text + '\r\n';
          isLatestCopyNotSelected = text;

          if (e.key === 'x') {
            this.lines.deleteLine(this.caret.top);
            if (this.caret.top === this.lines.lines.length)
              this.caret.set(0, this.caret.top - 1);
            else
              this.caret.set(0, this.caret.top);
          }
        }
        navigator.clipboard.writeText(text);
      } else if (e.key === 'a') {
        this.caret.set(0, 0);
        this.caret.changeSelection(this.lines.lines[this.lines.lines.length - 1].length, this.lines.lines.length - 1);
        this.caret.rangeStart = { left: 0, top: 0 };
        this.caret.set(this.lines.lines[this.lines.lines.length - 1].length, this.lines.lines.length - 1);
      }
    }
  }
}

const panes: Pane[] = [];
let selectedPaneId = 0;

const originalColor = '#fff'; // white
const commentColor = '#6a9955'; // green
const stringColor = '#ce9178'; // orange
const varColor = '#9cdcfe'; // light blue
const keywordColor = '#569cd6'; // blue
const controlColor = '#c586c0'; // pink
const accessibilityKeywordColor = '#3872df'; // dark blue

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

document.addEventListener('DOMContentLoaded', () => {
  const pane = Pane.create();
  Pane.create(false);

  pane.decorationsData.colors = [
    { id: 'comment.line', color: commentColor },
    { id: 'comment.block', color: commentColor },

    { id: 'bracket.brace', color: originalColor },
    { id: 'bracket.parenthesis', color: originalColor },

    { id: 'space.line-break', color: originalColor },
    { id: 'space.space', color: originalColor },

    { id: 'literal.string', color: stringColor },
    { id: 'literal.raw-string', color: stringColor },
    { id: 'literal.char', color: stringColor },
    { id: 'literal.number', color: '#b5cea8' },

    { id: 'operator', color: originalColor },

    { id: 'keyword.declarator', color: keywordColor },
    { id: 'keyword.builtin-type', color: keywordColor },
    { id: 'keyword.literal', color: keywordColor },
    { id: 'keyword.operator', color: keywordColor },
    { id: 'keyword.block-with-expr', color: controlColor },
    { id: 'keyword.block-without-expr', color: controlColor },
    { id: 'keyword.var', color: keywordColor },
    { id: 'keyword.const', color: keywordColor },
    { id: 'keyword.method', color: keywordColor },
    { id: 'keyword.expr', color: controlColor },
    { id: 'keyword.block-or-method', color: keywordColor },
    { id: 'keyword.method-or-const', color: keywordColor },
    { id: 'keyword.accessor', color: keywordColor },
    { id: 'keyword.other', color: keywordColor },

    { id: 'name.class', color: '#4ec9b0' },
    { id: 'name.struct', color: '#4ec9b0' },
    { id: 'name.fn', color: '#dcdcaa' },
    { id: 'name.var', color: varColor },
    { id: 'name.const', color: '#4fc1ff' },
    { id: 'name.fn-arg', color: varColor },
    { id: 'name.field', color: varColor },
    { id: 'name.prop', color: originalColor },
    { id: 'name.enum', color: '#4ec9b0' },
    { id: 'name.interface', color: '#4ec9b0' },
    { id: 'name.namespace', color: '#fff' },
    { id: 'name.other', color: varColor },

    { id: 'modifier.after-at', color: accessibilityKeywordColor },
    { id: 'modifier.other', color: keywordColor },
  ];

  const saved = localStorage.getItem('text') ?? '';
  const split = saved.split(splitByLineBreak);
  if (split.length > 1) {
    for (let i = 1; i < split.length; i++)
      pane.lines.appendLine();
  }
  Line.splitTextAndCreateToken(pane.lines, pane.decorationsData, saved, saved, 0, 0, false, 0, true);

  // Decorations.create(pane.paneId, pane.lines, pane.decorationsData, 0, 0, 2, 'green');
  // Decorations.create(pane.paneId, pane.lines, pane.decorationsData, 1, 1, 8, 'red');
  // Decorations.create(pane.paneId, pane.lines, pane.decorationsData, 1, 1, 8, undefined, 'error');

  document.onkeydown = (e) => {
    if (e.isComposing || e.keyCode === 243 || e.keyCode === 244) {
      return;
    }

    if (e.key === 'F5' || e.key === 'F12')
      return;

    e.preventDefault();

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;
    pane.keyDown(e);

    let tokenId = -1;
    const tokens: {
      tokenId: number;
      text: string;
      start: number;
      end: number;
      category: string | undefined;
      kind: string | undefined;
      data?: any;
    }[] = [];
    let jGoto = 0;
    for (let i = 0; i < panes[0].lines.lines.length; i++) {
      const line = panes[0].lines.lines[i];
      for (let j = jGoto; j < line.tokens.length; j++) {
        jGoto = 0;
        const token = line.tokens[j];
        if (token.kind === 'comment.block' || token.kind === 'literal.raw-string') {
          let lastSameKindIndex = j;
          let lastSameKindTop = i;
          let endIndex = -1;
          let endTop = i;
          let text = '';
          for (let k = j + 1; k < line.tokens.length; k++) {
            if (line.tokens[k].kind !== token.kind) {
              endIndex = lastSameKindIndex;
              text = line.tokens.slice(j, k).map(token => token.text).join('');
              break;
            } else {
              lastSameKindIndex = k;
            }
          }
          if (endIndex === -1) {
            for (let k = i + 1; k < panes[0].lines.lines.length; k++) {
              const line = panes[0].lines.lines[k];
              for (let l = 0; l < line.tokens.length; l++) {
                if (line.tokens[l].kind !== token.kind) {
                  if (lastSameKindTop === i) {
                    endIndex = lastSameKindIndex;
                    endTop = i;
                    text = panes[0].lines.lines[i].tokens.map(token => token.text).join('');
                  } else {
                    endIndex = lastSameKindIndex;
                    endTop = lastSameKindTop;
                    text = panes[0].lines.lines[i].tokens.slice(j).map(token => token.text).join('\r\n') + '\r\n' + panes[0].lines.lines.slice(i + 1, endTop).map(line => line.text).join('\r\n') + '\r\n' + panes[0].lines.lines[endTop].tokens.slice(0, lastSameKindIndex).map(token => token.text).join('\r\n');
                  }
                  break;
                } else {
                  lastSameKindIndex = l;
                  lastSameKindTop = k;
                }
              }
              if (endIndex !== -1)
                break;
            }
          }
          if (endIndex === -1) {
            endIndex = panes[0].lines.lines[panes[0].lines.lines.length - 1].tokens.length - 1;
            endTop = panes[0].lines.lines.length - 1;
            text = panes[0].lines.lines[i].tokens.slice(j).map(token => token.text).join('\r\n') + '\r\n' + panes[0].lines.lines.slice(i + 1, endTop + 1).map(line => line.text).join('\r\n');
          }

          tokens.push({
            tokenId: token.tokenId,
            start: token.start,
            end: panes[0].lines.lines[endTop].tokens[endIndex].end,
            text,
            category: token.category,
            kind: token.kind,
          })
          j = endIndex;
          if (endTop !== i) {
            i = endTop;
            jGoto = endIndex;
            continue;
          } else {
            jGoto = 0;
          }
        } else {
          tokens.push({
            tokenId: token.tokenId,
            start: token.start,
            end: token.end,
            text: token.text,
            category: token.category,
            kind: token.kind,
            data: token.data,
          });
        }
      }
      if (line.tokens.length > 0) {
        tokens.push({
          tokenId: tokenId--,
          start: line.tokens[line.tokens.length - 1].end,
          end: line.tokens[line.tokens.length - 1].end,
          text: '\r\n',
          kind: 'space.line-break',
          category: 'line_break',
        });
      }
    }

    worker.onmessage = (e) => {
      if (e.data.error) {
        if (e.data.error.cause) {
          document.getElementById('controlSpace')!.textContent = e.data.error.message + ' ' + e.data.error.cause.start + ' ' + e.data.error.cause.end;
          let length = 0;
          let left = 0;
          let top = -1;
          for (let i = 0; i < panes[0].lines.lines.length; i++) {
            const line = panes[0].lines.lines[i];
            for (let token of line.tokens) {
              for (let decoration of token.decorations) {
                if (decoration.type === 'error')
                  decoration.delete();
              }
            }
            if (top === -1) {
              length += line.length;
              if (length > e.data.error.cause.start) {
                left = e.data.error.cause.start - length + line.length;
                top = i;
                continue;
              }
            }
          }
          Decorations.create(panes[0].paneId, panes[0].lines, panes[0].decorationsData, left, top, e.data.error.cause.end - e.data.error.cause.start, undefined, 'error');
        } else {
          document.getElementById('controlSpace')!.textContent = e.data.error.message;
          for (let i = 0; i < panes[0].lines.lines.length; i++) {
            const line = panes[0].lines.lines[i];
            for (let token of line.tokens) {
              for (let decoration of token.decorations) {
                if (decoration.type === 'error')
                  decoration.delete();
              }
            }
          }
        }
        return;
      } else {
        document.getElementById('controlSpace')!.textContent = '';
        for (let i = 0; i < panes[0].lines.lines.length; i++) {
          const line = panes[0].lines.lines[i];
          for (let token of line.tokens) {
            for (let decoration of token.decorations) {
              if (decoration.type !== 'selection')
                decoration.delete();
            }
          }
        }
        panes[1].lines.deleteRange({ left: 0, top: 0 }, { left: panes[1].lines.lines[panes[1].lines.lines.length - 1].length, top: panes[1].lines.lines.length - 1 });
        const split = (e.data.converted as string).split(splitByLineBreak);
        panes[1].lines.lines[0].insertText(split[0], 0);
        for (let i = 1; i < split.length; i++) {
          panes[1].lines.appendLine(split[i], false);
        }
        (e.data.decorations as BaseDecoration[]).sort((a, b) => a.start - b.start);

        let top = 0;
        let left = 0;
        for (let decoration of (e.data.decorations as BaseDecoration[])) {
          for (let i = top; i < panes[0].lines.lines.length; i++) {
            if (panes[0].lines.lines[i].tokens.length > 0) {
              if (decoration.start >= panes[0].lines.lines[i].tokens[0].start && decoration.start <= panes[0].lines.lines[i].tokens[panes[0].lines.lines[i].tokens.length - 1].end) {
                top = i;
                left = decoration.start - panes[0].lines.lines[i].tokens[0].start;
                break;
              }
            }
          }
          Decorations.create(panes[0].paneId, panes[0].lines, panes[0].decorationsData, left, top, decoration.end - decoration.start, 'red');
        }
      }
    };
    worker.postMessage(tokens);
    localStorage.setItem('text', panes[0].lines.lines.map(line => line.text).join('\r\n'));

    let s = 0;
    for (let i = 0; i < pane.lines.lines.length; i++) {
      for (let j = 0; j < pane.lines.lines[i].tokens.length; j++) {
        if (s !== pane.lines.lines[i].tokens[j].start) {
          console.error('start error', i, j, s, pane.lines.lines);
          for (let k = i; k < pane.lines.lines.length; k++) {
            for (let l = j; l < pane.lines.lines[k].tokens.length; l++) {
              pane.lines.lines[k].tokens[l].start = s;
              s += pane.lines.lines[k].tokens[l].text.length;
              pane.lines.lines[k].tokens[l].end = s;
            }
          }
        }
        s = pane.lines.lines[i].tokens[j].end;
      }
    }
  };

  document.onkeyup = (e) => {
    if (e.isComposing || e.keyCode === 229) {
      return;
    }

    e.preventDefault();

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;
    stopRepeatAction(pane.repeatActionTimeout, pane.repeatActionInterval);
  };

  let isMouseDown = false;
  document.onmousedown = (e) => {
    for (let i = 0; i < panes.length; i++) {
      const paneElement = document.getElementById(`pane${panes[i].paneId}`)!;
      if (paneElement.offsetLeft <= e.clientX && e.clientX <= paneElement.offsetLeft + paneElement.offsetWidth) {
        panes.find(pane => pane.paneId === selectedPaneId)!.caret.hide();
        selectedPaneId = panes[i].paneId;
        panes[i].caret.show();
        break;
      }
    }

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;

    const position = calculateMousePosition(pane.paneId, pane.lines, e);
    if (position === null)
      return;
    if (e.shiftKey) {
      const left = pane.caret.rangeStart === null ? pane.caret.left : pane.caret.rangeStart.left;
      const top = pane.caret.rangeStart === null ? pane.caret.top : pane.caret.rangeStart.top;
      pane.caret.set(position.left, position.top);
      pane.caret.changeSelection(left, top);
    } else {
      pane.caret.clearSelection();
      pane.caret.set(position.left, position.top);
      isMouseDown = true;
    }
  };
  document.onmousemove = (e) => {
    if (isMouseDown === false) return;

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;
    debounce((e: MouseEvent) => {
      const position = calculateMousePosition(pane.paneId, pane.lines, e);
      if (position === null)
        return;
      if (pane.caret.left !== position.left || pane.caret.top !== position.top) {
        const left = pane.caret.rangeStart === null ? pane.caret.left : pane.caret.rangeStart.left;
        const top = pane.caret.rangeStart === null ? pane.caret.top : pane.caret.rangeStart.top;
        pane.caret.set(position.left, position.top);
        pane.caret.changeSelection(left, top);
      }
    }, 50, true)(e);
  };
  document.onmouseup = () => {
    isMouseDown = false;
  };
});

class Caret {
  constructor(private paneId: number, private decorationsData: DecorationsData) { }
  private isShown = true;

  public lines: Lines | undefined = undefined;

  private _left: number = 0;
  // テキストが変更されたら、_leftTemp、_topOfLeftTempをnullにする
  private _leftTemp: number | null = 0;
  private _topOfLeftTemp: number | null = null;
  private _top: number = 0;

  public rangeStart: { left: number, top: number } | null = null;
  public rangeEndsDecoration: { start: Token | null, end: Token | null } | null = null;

  public get left() {
    return this._left;
  }
  public get top() {
    return this._top;
  }
  public get offset() {
    if (this.lines!.lines.length === 1)
      return this._left;
    return this.lines!.lines.slice(0, this._top).reduce((acc, line) => acc + line.length + 1, 0) + this._left;
  }
  public get isRangeSelected() {
    return this.rangeStart !== null;
  }

  public set left(left: number) {
    if (left <= 0) {
      this._left = 0;
    } else {
      if (this.lines!.lines[this._top].length >= left) {
        this._left = left;
      } else {
        this._left = this.lines!.lines[this._top].length;
      }
    }
    this._leftTemp = this._left;
    this._topOfLeftTemp = this._top;
  }
  public set top(top: number) {
    if (top <= 0) {
      this._top = 0;
    } else if (top >= this.lines!.lines.length) {
      this._top = this.lines!.lines.length - 1;
    } else {
      this._top = top;
    }

    if ((this._leftTemp === null)) {
      this._left = this.lines!.lines[this._top].length;
    } else {
      if (this._topOfLeftTemp === null || this._topOfLeftTemp === this._top) {
        this._left = this._leftTemp;
      } else {
        const width = measureTextWidth(this.paneId, this.lines!.lines[this._topOfLeftTemp].text.slice(0, this._leftTemp));
        const text = this.lines!.lines[this._top].text;
        for (let i = 0; i <= this.lines!.lines[this._top].length; i++) {
          const lastCharWidth = measureTextWidth(this.paneId, text.slice(i - 1, i));
          const nextWidth = measureTextWidth(this.paneId, text.slice(0, i));
          if (nextWidth >= width - lastCharWidth / 2) {
            this._left = i;
            return;
          }
        }
        this._left = this.lines!.lines[this._top].length;
      }
    }
  }
  public set(left: number, top: number) {
    this._top = top;
    this.left = left;
    this._leftTemp = left;
    this._topOfLeftTemp = top;
    this.top = top;

    this.move(this._left, this._top);
  }

  public moveWithOffset(offset: number) {
    if (offset < 0) {
      this.left = 0;
      this.top = 0;
    } else {
      while (true) {
        if (this.lines!.lines[this.top].length - offset >= 0) {
          this.left = offset;
          break;
        } else {
          offset -= this.lines!.lines[this.top].length + 1;
          this.top++;
        }
      }

      this.move(this._left, this._top);
    }
    this._leftTemp = this.left;
    this._topOfLeftTemp = this.top;
  }
  public moveLeft() {
    if (this.left === 0) {
      if (this.top === 0)
        return;
      this.top--;
      this.left = this.lines!.lines[this.top].length;
    } else if (this.left > 0) {
      this.left--;
    } else if (this.top > 0) {
      this.top--;
      this.left = this.lines!.lines[this.top].length;
    }
    this._leftTemp = this.left;
    this._topOfLeftTemp = this.top;

    this.move(this._left, this._top);
  }
  public moveRight() {
    if (this.left < this.lines!.lines[this.top].length) {
      this.left++;
    } else if (this.top < this.lines!.lines.length - 1) {
      this.top++;
      this.left = 0;
    }
    this._leftTemp = this.left;
    this._topOfLeftTemp = this.top;

    this.move(this._left, this._top);
  }
  public moveUp() {
    if (this.top > 0) {
      this.top--;
      if (this._left > this.lines!.lines[this.top].length) {
        this._leftTemp = this.left;
        this._topOfLeftTemp = this.top;
      }
    }

    this.move(this._left, this._top);
  }
  public moveDown() {
    if (this.top < this.lines!.lines.length - 1) {
      this.top++;
      if (this._left > this.lines!.lines[this.top].length) {
        this._leftTemp = this.left;
        this._topOfLeftTemp = this.top;
      }
    }

    this.move(this._left, this._top);
  }

  private caretBlinkInterval: number | null = null;
  private caretMovedTime = 0;
  private move(left: number, top: number) {
    const caret = document.querySelector(`#pane${this.paneId} #caret`);
    if (caret !== null) {
      document.querySelector(`#pane${this.paneId} .lineNumber.selected`)?.classList.remove('selected');

      const lineNumberElement = document.getElementById(`line${this.lines!.lines[this.top].lineId}`)!.children[0];
      if (this.isShown)
        lineNumberElement.classList.add('selected');

      const styleOfLineNumberElement = getComputedStyle(lineNumberElement);
      const marginLeft = parseFloat(styleOfLineNumberElement.width.replace('px', '')) + parseFloat(styleOfLineNumberElement.paddingRight.replace('px', ''));
      caret.classList.remove('blink');
      const caretLeft = measureTextWidth(this.paneId, this.lines!.lines[top].text.slice(0, left));
      (caret as HTMLElement).style.left = `${caretLeft - 1 + marginLeft}px`;
      (caret as HTMLElement).style.top = `${document.getElementById('line' + this.lines!.lines[top].lineId.toString())?.offsetTop}px`;
      if (this.caretBlinkInterval !== null) {
        clearInterval(this.caretBlinkInterval);
      }

      if (this.isShown) {
        const now = Date.now();
        this.caretMovedTime = now;
        setTimeout(() => {
          if (this.caretMovedTime === now) {
            window.requestAnimationFrame(() => {
              caret.classList.add('blink');
            });
          }
        }, 500);
      }
    }
  }

  lineIdBeforeHide: number = 0;
  public show() {
    this.isShown = true;
    const caret = document.querySelector(`#pane${this.paneId} #caret`);
    if (caret !== null) {
      caret.classList.remove('hidden');
      document.getElementById(`line${this.lineIdBeforeHide}`)?.classList.add('selected');
    }
  }
  public hide() {
    this.isShown = false;
    const caret = document.querySelector(`#pane${this.paneId} #caret`);
    if (caret !== null) {
      caret.classList.add('hidden');
      document.querySelector(`#pane${this.paneId} .lineNumber.selected`)?.classList.remove('selected');
      this.lineIdBeforeHide = this.lines!.lines[this.top].lineId;
    }
  }

  public changeSelection(left: number, top: number) {
    this.rangeStart = { left, top };
    const isCaretUpper = this.top < this.rangeStart.top || (this.top === this.rangeStart.top && this.left < this.rangeStart.left);
    const start = isCaretUpper ? { left: this.left, top: this.top } : { left: this.rangeStart.left, top: this.rangeStart.top };
    const end = isCaretUpper ? { left: this.rangeStart.left, top: this.rangeStart.top } : { left: this.left, top: this.top };

    this.clearSelection(false);

    let startLeftAtStartEnd = 0;
    for (let i = start.top; i >= 0; i--) {
      if (this.lines!.lines[i].tokens.length > 0) {
        startLeftAtStartEnd = this.lines!.lines[i].tokens[0].start + start.left;
        break;
      }
    }
    let endLeftAtStartEnd = 0;
    for (let i = end.top; i >= 0; i--) {
      if (this.lines!.lines[i].tokens.length > 0) {
        endLeftAtStartEnd = this.lines!.lines[i].tokens[0].start + end.left;
        break;
      }
    }

    if (start.top === end.top) {
      this.lines!.lines[start.top].tokens.forEach(token => {
        if (token.start >= startLeftAtStartEnd && token.end <= endLeftAtStartEnd) {
          token.element!.classList.add('selection');
        }
      });
    } else {
      const startTokens = this.lines!.lines[start.top].tokens.filter(token => token.start >= startLeftAtStartEnd);
      startTokens.forEach(token => {
        token.element!.classList.add('selection');
      });
      if (startTokens.length > 0)
        startTokens[startTokens.length - 1].element!.classList.add('extensionOfLineBreak');
      else
        createExtensionOfLineBreakForEmptyLine(this.lines!, start.top);

      for (let i = start.top + 1; i <= end.top - 1; i++) {
        for (let j = 0; j < this.lines!.lines[i].tokens.length; j++) {
          this.lines!.lines[i].tokens[j].element!.classList.add('selection');
        }
        if (this.lines!.lines[i].tokens.length > 0)
          this.lines!.lines[i].tokens[this.lines!.lines[i].tokens.length - 1].element!.classList.add('extensionOfLineBreak');
        else
          createExtensionOfLineBreakForEmptyLine(this.lines!, i);
      }

      this.lines!.lines[end.top].tokens.forEach(token => {
        if (token.end <= endLeftAtStartEnd)
          token.element!.classList.add('selection');
      });
    }
    const startIsHead = isHeadOfToken(this.lines!, start.left, start.top, startLeftAtStartEnd);
    const endIsHead = isHeadOfToken(this.lines!, end.left, end.top, endLeftAtStartEnd);
    if (startIsHead === false) {
      const startDecorationToken = createStartDecoration(this.paneId, this.lines!, this.decorationsData);
      this.rangeEndsDecoration = startDecorationToken.rangeEndsDecoration;
      if (endIsHead === false) {
        const created = createEndDecoration(this.paneId, this.lines!, this.decorationsData, this.rangeEndsDecoration, startDecorationToken.startToken);
        this.rangeEndsDecoration = created;
      }
    } else if (endIsHead === false) {
      const created = createEndDecoration(this.paneId, this.lines!, this.decorationsData, this.rangeEndsDecoration);
      this.rangeEndsDecoration = created;
    }

    function createStartDecoration(paneId: number, lines: Lines, decorationsData: DecorationsData) {
      const startToken = lines.lines[start.top].tokens.find(token => token.end >= startLeftAtStartEnd)!;
      Decoration.create(paneId, decorationsData, startToken, startLeftAtStartEnd - startToken.start, startToken.text.length - (startLeftAtStartEnd - startToken.start), SELECTION_COLOR_ID, 'selection');
      const rangeEndsDecoration = { start: startToken, end: null };
      return { startToken, rangeEndsDecoration };
    }
    function createEndDecoration(paneId: number, lines: Lines, decorationsData: DecorationsData, rangeEndsDecoration: { start: Token | null, end: Token | null } | null, startDecorationToken: Token | null = null) {
      const endToken = findLast(lines.lines[end.top].tokens, token => token.start <= endLeftAtStartEnd)!;

      if (endToken === startDecorationToken) {
        const decoration = startDecorationToken.decorations.find(decoration => decoration.type === 'selection')!;
        decoration.length = endLeftAtStartEnd - startDecorationToken.start - decoration.offset;
        return rangeEndsDecoration;
      }

      Decoration.create(paneId, decorationsData, endToken, 0, endLeftAtStartEnd - endToken.start, SELECTION_COLOR_ID, 'selection');
      if (rangeEndsDecoration === null)
        rangeEndsDecoration = { start: null, end: endToken };
      else
        rangeEndsDecoration.end = endToken;

      return rangeEndsDecoration;
    }

    function createExtensionOfLineBreakForEmptyLine(lines: Lines, top: number) {
      const element = document.createElement('span');
      element.classList.add('extensionOfLineBreakForEmptyLine');
      document.getElementById('line' + lines.lines[top].lineId.toString())?.appendChild(element);
    }

    function isHeadOfToken(lines: Lines, left: number, top: number, leftAtStartEnd: number) {
      if (left === 0 || lines.lines[top].tokens.length === 0 || left === lines.lines[top].length)
        return true;
      return lines.lines[top].tokens.some(token => token.start === leftAtStartEnd);
    }
  }
  public clearSelection(isClearRangeStart = true) {
    if (this.rangeStart !== null) {
      if (isClearRangeStart)
        this.rangeStart = null;
      document.querySelectorAll('.selection').forEach(element => element.classList.remove('selection'));
      document.querySelectorAll('.extensionOfLineBreak').forEach(element => element.classList.remove('extensionOfLineBreak'));
      document.querySelectorAll('.extensionOfLineBreakForEmptyLine').forEach(element => element.remove());
      this.removeEndsDecoration();
    }
  }

  private removeEndsDecoration() {
    if (this.rangeEndsDecoration !== null) {
      this.rangeEndsDecoration.start?.deleteSelectionDecoration();
      this.rangeEndsDecoration.end?.deleteSelectionDecoration();
      this.rangeEndsDecoration = null;
    }
  }
}

class Lines {
  constructor(private paneId: number, private caret: Caret, private decorationsData: DecorationsData) { }

  lines: Line[] = [];
  ranges: {
    start: number;
    startTop: number;
    end: number;
    endTop?: number | undefined;
    kind: "string_literal" | "raw_string_literal" | "char_literal" | "number_literal" | "line_comment" | "block_comment";
  }[] = [];

  public appendLine(text: string = '', doSplit = true) {
    const line = new Line(this.paneId, this.caret, this, this.decorationsData);
    this.lines.push(line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const lineNumber = document.createElement('span');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = this.lines.length.toString();
    newLine.append(lineNumber);
    document.getElementById(`pane${this.paneId}`)!.appendChild(newLine);

    let textIndexOffset = 0;
    for (let i = this.lines.length - 2; i >= 0; i--) {
      if (this.lines[i].tokens.length > 0) {
        textIndexOffset = this.lines[i].tokens[this.lines[i].tokens.length - 1].end;
        break;
      }
    }

    if (text !== '') {
      if (doSplit)
        Line.splitTextAndCreateToken(this, this.decorationsData, text, text, this.lines.length - 1, 0, false, textIndexOffset);
      else
        Token.create(this, this.decorationsData, this.lines.length - 1, 0, text, textIndexOffset, textIndexOffset + text.length, undefined, undefined);
    }

    this.updateLineNumberWidth();
  }
  public insertLine(top: number, text: string = '', doSplit = true) {
    const line = new Line(this.paneId, this.caret, this, this.decorationsData);
    this.lines.splice(top, 0, line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const lineNumber = document.createElement('span');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = (top + 1).toString();
    newLine.append(lineNumber);
    if (top === this.lines.length - 1)
      document.getElementById(`pane${this.paneId}`)!.appendChild(newLine);
    else
      document.getElementById(`pane${this.paneId}`)!.insertBefore(newLine, document.getElementById('line' + this.lines[top + 1].lineId.toString()));

    let textIndexOffset = 0;
    for (let i = top - 1; i >= 0; i--) {
      if (this.lines[i].tokens.length > 0) {
        textIndexOffset = this.lines[i].tokens[this.lines[i].tokens.length - 1].end;
        break;
      }
    }
    if (text !== '') {
      if (doSplit)
        Line.splitTextAndCreateToken(this, this.decorationsData, text, text, top, 0, false, textIndexOffset);
      else
        Token.create(this, this.decorationsData, top, 0, text, textIndexOffset!, textIndexOffset! + text.length, undefined, undefined);
    }

    this.updateLineNumber(top + 1);
    this.updateLineNumberWidth();
  }
  public deleteLine(top: number, changeStartEnd = true) {
    const length = this.lines[top].length;
    document.getElementById('line' + this.lines[top].lineId.toString())?.remove();

    for (let token of this.lines[top].tokens) {
      token.delete();
    }

    this.lines.splice(top, 1);

    if (changeStartEnd)
      for (let i = top; i < this.lines.length; i++)
        this.lines[i].leftOfTokensOffset -= length;

    this.updateLineNumber(top);
  }
  public swapLine(top: number, length: number, isUp: boolean) {
    if (isUp) {
      if (top === 0)
        return;

      let start = 0;
      for (let i = top - 1; i >= 0; i--) {
        if (this.lines[i].tokens.length > 0) {
          start = this.lines[i].tokens[0].start;
          break;
        }
      }

      const move = document.getElementById('line' + this.lines[top - 1].lineId.toString());
      if (top + length === this.lines.length)
        document.getElementById(`pane${this.paneId}`)!.appendChild(move!);
      else
        document.getElementById(`pane${this.paneId}`)!.insertBefore(move!, document.getElementById('line' + this.lines[top + length].lineId.toString()));
      this.lines.splice(top - 1, 0, ...this.lines.splice(top, length));

      let sumLength = 0;
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < this.lines[top - 1 + i].tokens.length; j++) {
          this.lines[top - 1 + i].tokens[j].start = start + sumLength;
          this.lines[top - 1 + i].tokens[j].end = start + sumLength + this.lines[top - 1 + i].tokens[j].text.length;
          sumLength += this.lines[top - 1 + i].tokens[j].text.length;
        }
      }
      for (let i = 0; i < this.lines[top - 1 + length].tokens.length; i++) {
        this.lines[top - 1 + length].tokens[i].start = start + sumLength;
        this.lines[top - 1 + length].tokens[i].end = start + sumLength + this.lines[top - 1 + length].tokens[i].text.length;
        sumLength += this.lines[top - 1 + length].tokens[i].text.length;
      }
    } else {
      if (top + length === this.lines.length)
        return;

      let start = 0;
      for (let i = top; i >= 0; i--) {
        if (this.lines[i].tokens.length > 0) {
          start = this.lines[i].tokens[0].start;
          break;
        }
      }

      const move = document.getElementById('line' + this.lines[top + length].lineId.toString());
      document.getElementById(`pane${this.paneId}`)!.insertBefore(move!, document.getElementById('line' + this.lines[top].lineId.toString()));
      this.lines.splice(top + 1, 0, ...this.lines.splice(top, length));

      let sumLength = 0;
      for (let i = 0; i < this.lines[top].tokens.length; i++) {
        this.lines[top].tokens[i].moveLineInfo(top);
        this.lines[top].tokens[i].start = start + sumLength;
        this.lines[top].tokens[i].end = start + sumLength + this.lines[top].tokens[i].text.length;
        sumLength += this.lines[top].tokens[i].text.length;
      }
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < this.lines[top + 1 + i].tokens.length; j++) {
          this.lines[top + 1 + i].tokens[j].moveLineInfo(top + 1);
          this.lines[top + 1 + i].tokens[j].start = start + sumLength;
          this.lines[top + 1 + i].tokens[j].end = start + sumLength + this.lines[top + 1 + i].tokens[j].text.length;
          sumLength += this.lines[top + 1 + i].tokens[j].text.length;
        }
      }
    }

    this.updateLineNumber(isUp ? top - 1 : top);
  }

  public deleteRange(first: { left: number, top: number }, second: { left: number, top: number }) {
    const start = first.top < second.top ? first : (first.top === second.top && first.left < second.left ? first : second);
    const end = first.top < second.top ? second : (first.top === second.top && first.left < second.left ? second : first);
    if (start.top === end.top) {
      this.lines[start.top].deleteText(start.left, end.left - start.left);
    } else {
      const caretLeft = start.left;
      const caretTop = start.top;

      const remainText = this.lines[start.top].text.slice(0, start.left) + this.lines[end.top].text.slice(end.left);

      this.insertLine(start.top, remainText);

      for (let i = 0; i < this.lines[start.top + 1].tokens.length; i++) {
        for (let j = 0; j < this.lines[start.top + 1].tokens[i].decorations.length; j++) {
          const decoration = this.lines[start.top + 1].tokens[i].decorations[j];
          let startLeft = this.lines[start.top + 1].tokens[i].start - this.lines[start.top + 1].tokens[0].start + decoration.offset;
          let endLeft = startLeft + decoration.length;

          if (false) {
          } else {
            if (startLeft !== endLeft) {
              if (endLeft > start.left)
                endLeft = start.left;
              Decorations.create(this.paneId, this, this.decorationsData, startLeft, start.top, endLeft - startLeft, decoration.colorId, decoration.type);
            }
          }
        }
      }
      for (let i = 0; i < this.lines[end.top + 1].tokens.length; i++) {
        for (let j = 0; j < this.lines[end.top + 1].tokens[i].decorations.length; j++) {
          const decoration = this.lines[end.top + 1].tokens[i].decorations[j];
          let startLeft = this.lines[end.top + 1].tokens[i].start - this.lines[end.top + 1].tokens[0].start + decoration.offset - (end.left - start.left);
          let endLeft = startLeft + decoration.length;

          if (startLeft !== endLeft) {
            if (startLeft < 0)
              startLeft = 0;
            Decorations.create(this.paneId, this, this.decorationsData, startLeft, start.top, endLeft - startLeft, decoration.colorId, decoration.type);
          }
        }
      }

      for (let i = end.top + 1; i >= start.top + 1; i--) {
        this.deleteLine(i);
      }

      for (let i = start.top + 1; i < this.lines.length; i++) {
        this.lines[i].leftOfTokensOffset += remainText.length;
      }

      this.caret.set(caretLeft, caretTop);
    }

    this.updateLineNumber(start.top);
    this.updateLineNumberWidth();
  }

  private updateLineNumber(top: number) {
    for (let i = top; i < this.lines.length; i++)
      document.getElementById('line' + this.lines[i].lineId.toString())!.children[0].textContent = (i + 1).toString();
  }
  private lineNumberWidth = 4;
  private updateLineNumberWidth() {
    const textLength = this.lines.length.toString().length;
    let lineNumberWidth = textLength <= 4 ? 4 : textLength;
    if (lineNumberWidth !== this.lineNumberWidth) {
      this.lineNumberWidth = lineNumberWidth;
      document.documentElement.style.setProperty('--line-number-width', `${lineNumberWidth}ch`);
      this.caret.set(this.caret.left, this.caret.top);
    }
  }
}

class Line {
  private static readonly separateByKeyword = /[\w\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Han}、。￥・！”＃＄％＆’（）＊＋，．ー／：；＜＝＞？＠＿‘＾｜～「」｛｝［］【】≪≫《》〈〉〔〕]+|\r\n|\r|\n|([^\S\r\n]+)|==|!=|<=|>=|&&|\|\||=>|\+\+|--|\+=|-=|\*=|\/=|%=|\?\.|!\.|\?\?|\?\?=|>>>|<<|>>|<<=|>>=|>>>=|&=|\^=|\|=|::|\.\.|->|\/\*|\*\/|\W/gu;
  private static readonly commentRegex = /(?:(\/\/.*?)(?:\r\n|\r|\n))|(\/\/.*?$)|(\/\*.*?\*\/)/yms;
  private static readonly stringLiteralRegex = /(?:(\$@"|@\$"|@")((?:(?:[^\+\r\n,;]*?)(?:"")*)*)(?:(?:,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>)|(")))|(?:((?<!@)\$?)(")((?:[^"\\]|\\.)*?)(?:(?:(?<!\\)(\\\\)*[;,]|(?= *?(?:\r\n|\r|\n|$|\+|==|!=|<=|>=|=>)))|(?<!\\)(\\\\)*(")))/y;
  private static readonly rawStringLiteralRegex = /(?<!@)(?<!\$)(\$+?@?|@?\$+?)?(`.*?(?<!\\)`|(?<quote>"{3,}).*?\k<quote>(?!\"))/yms;
  private static readonly charLiteralRegex = /(')([^ \r\n]+?)(?:(')|(?: |,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>))/y;
  private static readonly numberLiteralRegex = /\d+(?:\.\d+)?/y;
  // 厳密な判定を行うなら↓
  // private charLiteralRegex = /(')(?:(\\x[0-9A-Fa-f]{1,4})|(\\u[0-9A-Fa-f]{4})|(\\U[0-9A-Fa-f]{8})|(\\['"\\0abefnrtv]))(?:(')|(?: |,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>))/g;
  private static readonly regexSearchStartRegex = /(\$@"|@\$"|@"|\$"|")|(?<!@)(?<!\$)(?:\$+?@?|@?\$+?)?(`|"{3,})|(')|(\d)|(\/\/)|(\/\*)/g;

  private static lastLineId: number = 0;

  public constructor(paneId: number, private caret: Caret, private lines: Lines, private decorationsData: DecorationsData, tokens?: Token[]) {
    this.paneId = paneId;
    this.lines = lines;
    this.lineId = Line.lastLineId++;
    if (tokens !== undefined)
      this.tokens = tokens;
  }

  private readonly paneId: number;
  readonly lineId: number;
  private _tokens: Token[] = [];
  public leftOfTokensOffset = 0;

  get tokens() {
    return this._tokens;
  }
  set tokens(tokens: Token[]) {
    for (let oldToken of this._tokens) {
      oldToken.delete();
    }

    this._tokens = tokens;

    const lineElement = document.getElementById('line' + this.lineId.toString());
    if (lineElement === null) return;
    for (let element of lineElement.children) {
      if (element.classList.contains('token'))
        element.remove();
    }

    for (let token of this.tokens) {
      const newToken = document.createElement('span');
      newToken.id = `token${token.tokenId}`;
      newToken.classList.add('token');
      const textElement = document.createElement('span');
      textElement.textContent = token.text;
      newToken.append(textElement);
      lineElement.appendChild(newToken);
    }
  }

  get text() {
    return this.tokens.map(token => token.text).join('');
  }

  get length() {
    return this.tokens.reduce((acc, token) => acc + token.text.length, 0);
  }

  /**
   * 文字列全体からStringLiteral、RawStringLiteral、CharLiteral、NumberLiteral、Commentを検索し、その範囲を返す
   */
  private static searchLiteralAndComment(lines: Lines, entireText: string | undefined = undefined) {
    entireText ?? (entireText = lines.lines.map(line => line.text).join('\r\n'));

    const ranges: { start: number, end: number, startTop: number, endTop?: number, kind: 'string_literal' | 'raw_string_literal' | 'char_literal' | 'number_literal' | 'line_comment' | 'block_comment' }[] = [];

    let top = 0;
    for (let i = 0; i < entireText.length;) {
      this.commentRegex.lastIndex = i;
      this.stringLiteralRegex.lastIndex = i;
      this.rawStringLiteralRegex.lastIndex = i;
      this.charLiteralRegex.lastIndex = i;
      this.numberLiteralRegex.lastIndex = i;

      let commentPosition = findComment(this.commentRegex, entireText);
      let stringLiteralPosition = findStringLiteral(this.stringLiteralRegex, entireText);
      let rawStringLiteralPosition = findRawStringLiteral(this.rawStringLiteralRegex, entireText);
      let charLiteralPosition = findCharLiteral(this.charLiteralRegex, entireText);
      let numberLiteralPosition = findNumberLiteral(this.numberLiteralRegex, entireText);

      if (commentPosition !== null && (stringLiteralPosition === null || commentPosition.start < stringLiteralPosition.start) && (rawStringLiteralPosition === null || commentPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition === null || commentPosition.start < charLiteralPosition.start) && (numberLiteralPosition === null || commentPosition.start < numberLiteralPosition.start)) {
        ranges.push({
          start: commentPosition.start,
          end: commentPosition.end,
          startTop: top,
          kind: commentPosition.isBlock ? 'block_comment' : 'line_comment'
        });
      } else if (stringLiteralPosition !== null && (rawStringLiteralPosition === null || stringLiteralPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition === null || stringLiteralPosition.start < charLiteralPosition.start) && (numberLiteralPosition === null || stringLiteralPosition.start < numberLiteralPosition.start)) {
        ranges.push({
          start: stringLiteralPosition.start,
          end: stringLiteralPosition.end,
          startTop: top,
          kind: 'string_literal'
        });
      } else if (rawStringLiteralPosition !== null && (charLiteralPosition === null || rawStringLiteralPosition.start < charLiteralPosition.start) && (numberLiteralPosition === null || rawStringLiteralPosition.start < numberLiteralPosition.start)) {
        ranges.push({
          start: rawStringLiteralPosition.start,
          end: rawStringLiteralPosition.end,
          startTop: top,
          kind: 'raw_string_literal'
        });
      } else if (charLiteralPosition !== null && (numberLiteralPosition === null || charLiteralPosition.start < numberLiteralPosition.start)) {
        ranges.push({
          start: charLiteralPosition.start,
          end: charLiteralPosition.end,
          startTop: top,
          kind: 'char_literal'
        });
      } else if (numberLiteralPosition !== null) {
        ranges.push({
          start: numberLiteralPosition.start,
          end: numberLiteralPosition.end,
          startTop: top,
          kind: 'number_literal'
        });
      } else {
        if (entireText[i] === '\r') {
          i++;
          top++;
        }
        i++;
        continue;
      }

      incrementTop(ranges[ranges.length - 1].start, ranges[ranges.length - 1].end);
      ranges[ranges.length - 1].endTop = top;
      i = ranges[ranges.length - 1].end;
    }
    return ranges;

    function incrementTop(start: number, end: number) {
      for (let j = start; j < end; j++) {
        if (entireText![j] === '\n') {
          top++;
        } else if (entireText![j] === '\r') {
          if (entireText![j + 1] === '\n')
            j++;
          top++;
        }
      }
    }
  }

  /**
   * 文字列をトークン単位に分割し、HTML要素を作成し、かつLines.lineに追加する
   * @param text 分割する文字列
   * @param top トークンを追加する行番号
   * @param insertIndex 行の中でのトークンの追加位置
   * @param appendToLineLater 後で戻り値に含まれる関数を使用して行に追加するか（関数実行時の環境でトークンが作成される）
   * @param textIndexOffset token.startとtoken.endの値に加算する値
   * @returns token: 追加されたトークン, element: 作成されたトークンのHTML要素, appendToLineFunc: 行にトークンを追加する関数（appendToLineLaterがtrueの場合のみ）
   */
  public static splitTextAndCreateToken(lines: Lines, decorationsData: DecorationsData, text: string, lineText: string, top: number, insertIndex: number, appendToLineLater = false, textIndexOffset = 0, multiLine = false): {
    token: Token;
    element: HTMLSpanElement;
    appendToLineFunc?: (() => void) | undefined;
  }[] | number {
    let target: {
      start: number;
      end: number;
      startTop: number;
      endTop?: number | undefined;
      kind: "string_literal" | "raw_string_literal" | "char_literal" | "number_literal" | "line_comment" | "block_comment";
    }[] = [];
    const insertLeft = lines.lines[top].tokens.length > 0 ? (insertIndex === lines.lines[top].tokens.length ? lines.lines[top].tokens[lines.lines[top].tokens.length - 1].end : lines.lines[top].tokens[insertIndex].start) - lines.lines[top].tokens[0].start : 0;
    let insertStart = insertLeft;
    for (let i = top - 1; i >= 0; i--) {
      if (lines.lines[i].tokens.length > 0) {
        insertStart = lines.lines[i].tokens[lines.lines[i].tokens.length - 1].end + insertLeft;
        break;
      }
    }

    const texts: string[] = [];
    for (let i = 0; i < lines.lines.length; i++) {
      if (i === top) {
        texts.push(lineText);
      } else {
        texts.push(lines.lines[i].text);
      }
    }
    let entireText = texts.join('\r\n');

    if (multiLine === false) {
      const ranges = Line.searchLiteralAndComment(lines, entireText);

      const regexSearchStartResult = regexSearchStart();
      function regexSearchStart() {
        const result = Line.regexSearchStartRegex.exec(text);
        if (result === null)
          return null;
        return {
          kind: ["string_literal", "raw_string_literal", "char_literal", "number_literal", "line_comment", "block_comment"][result.findIndex((value, index) => index !== 0 && value !== undefined)! - 1],
          index: result.index,
        };
      }

      target = ranges.filter(range => {
        const startOffset = regexSearchStartResult !== null && range.kind === regexSearchStartResult.kind ? regexSearchStartResult.index : 0;
        return range.start <= insertStart + top * 2 + startOffset && insertStart + top * 2 + startOffset <= range.end;
      });
      target.push(...lines.ranges.filter(range => {
        const startOffset = regexSearchStartResult !== null && range.kind === regexSearchStartResult.kind ? regexSearchStartResult.index : 0;
        return range.start <= insertStart + top * 2 + startOffset && insertStart + top * 2 + startOffset <= range.end;
      }));
      if (target.length > 0) {
        target.sort((a, b) => a.start === b.start ? a.end - b.end : a.start - b.start);
        multiLine = true;

        let startTop = target[0].startTop;
        let endTop = target[target.length - 1].endTop!;
        let previousStart = target[0].start;
        for (let i = startTop; i >= 0; i--) {
          const found = ranges.find(range => range.endTop === i && range.start < previousStart && range.start !== target[0].start && range.end !== target[0].end);
          if (found === undefined) {
            break;
          } else {
            startTop = found.startTop;
            previousStart = found.start;
          }
        }
        let previousEnd = target[target.length - 1].end;
        for (let i = endTop; i < lines.lines.length; i++) {
          const found = ranges.find(range => range.startTop === i && range.end > previousEnd && range.start !== target[target.length - 1].start && range.end !== target[target.length - 1].end);
          if (found === undefined) {
            break;
          } else {
            endTop = found.endTop!;
            previousEnd = found.end;
          }
        }

        text = texts.slice(startTop, endTop + 1).join('\r\n');
        top = startTop;
        insertIndex = 0;
        appendToLineLater = false;
        textIndexOffset = 0;
        for (let i = startTop - 1; i >= 0; i--) {
          if (lines.lines[i].tokens.length > 0) {
            textIndexOffset = lines.lines[i].tokens[lines.lines[i].tokens.length - 1].end;
            break;
          }
        }

        for (let i = startTop; i <= endTop; i++) {
          lines.lines[i].tokens.forEach(token => token.delete());
          lines.lines[i]._tokens.splice(0, lines.lines[i].tokens.length);
        }

        lines.ranges = ranges;
      }
    }

    interface Word {
      text: string;
      start: number;
      end: number;
      category: Category | undefined;
      kind?: Kind | undefined;
    }
    const words: Word[] = [];
    let match: RegExpExecArray | null;
    let matchPreviousNumberLiteral: RegExpExecArray | null = null;
    let matchPreviousDecimalPoint: RegExpExecArray | null = null;
    while ((match = Line.separateByKeyword.exec(text)) != null) {
      let category: Category;
      let kind: Kind | undefined;
      if (match[1] === undefined) {
        if (matchPreviousNumberLiteral !== null) {
          if (match[0] === '.') {
            if (matchPreviousDecimalPoint !== null)
              throw new SyntaxError({ content: '.', start: matchPreviousDecimalPoint.index, end: 1 }, 'Unexpected decimal point');
            matchPreviousDecimalPoint = match;
            continue;
          } else {
            if (matchPreviousDecimalPoint !== null) {
              if (isNaN(Number(match[0][0])) === false) {
                words.push({
                  text: matchPreviousNumberLiteral[0] + matchPreviousDecimalPoint[0] + match[0],
                  start: matchPreviousNumberLiteral.index + textIndexOffset,
                  end: matchPreviousDecimalPoint.index + matchPreviousDecimalPoint[0].length + match[0].length + textIndexOffset,
                  category: 'number_literal',
                  kind: 'literal.number',
                });
                matchPreviousNumberLiteral = null;
                matchPreviousDecimalPoint = null;
                continue;
              } else {
                words.push({
                  text: matchPreviousNumberLiteral[0],
                  start: matchPreviousNumberLiteral.index + textIndexOffset,
                  end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
                  category: 'number_literal',
                  kind: 'literal.number',
                });
                words.push({
                  text: matchPreviousDecimalPoint[0],
                  start: matchPreviousDecimalPoint.index + textIndexOffset,
                  end: matchPreviousDecimalPoint.index + matchPreviousDecimalPoint[0].length + textIndexOffset,
                  category: 'operator',
                  kind: 'operator',
                });
                matchPreviousNumberLiteral = null;
                matchPreviousDecimalPoint = null;
              }
            } else {
              words.push({
                text: matchPreviousNumberLiteral[0],
                start: matchPreviousNumberLiteral.index + textIndexOffset,
                end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
                category: 'number_literal',
                kind: 'literal.number',
              });
              matchPreviousNumberLiteral = null;
            }
          }
        }
        if (match[0] === '\r\n' || match[0] == '\n') {
          category = 'line_break';
        } else if (operators.has(match[0])) {
          category = 'operator';
          kind = 'operator';
        } else if (keywords.has(match[0])) {
          category = 'keyword';
          kind = kindOfKeywordOrModifier(match[0]);
        } else if (contextKeywords.has(match[0])) {
          category = 'context_keyword';
          kind = kindOfKeywordOrModifier(match[0]);
        } else {
          if (isNaN(Number(match[0][0])) === false) {
            if (matchPreviousNumberLiteral !== null)
              throw new SyntaxError({ content: match[0][0], start: match.index, end: match.index + match.length }, 'Unexpected number literal');
            matchPreviousNumberLiteral = match;
            continue;
          } else {
            category = undefined;
          }
        }
      } else {
        if (matchPreviousNumberLiteral !== null) {
          words.push({
            text: matchPreviousNumberLiteral[0],
            start: matchPreviousNumberLiteral.index + textIndexOffset,
            end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
            category: 'number_literal',
            kind: 'literal.number',
          });
          matchPreviousNumberLiteral = null;
        }
        category = 'space';
      }
      words.push({
        text: match[0],
        start: match.index + textIndexOffset,
        end: match.index + match[0].length + textIndexOffset,
        category,
        kind,
      });
    }
    if (matchPreviousNumberLiteral !== null) {
      words.push({
        text: matchPreviousNumberLiteral[0],
        start: matchPreviousNumberLiteral.index + textIndexOffset,
        end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
        category: 'number_literal',
        kind: 'literal.number',
      });
      matchPreviousNumberLiteral = null;
      if (matchPreviousDecimalPoint !== null) {
        words.push({
          text: matchPreviousDecimalPoint[0],
          start: matchPreviousDecimalPoint.index + textIndexOffset,
          end: matchPreviousDecimalPoint.index + matchPreviousDecimalPoint[0].length + textIndexOffset,
          category: 'operator',
          kind: 'operator',
        });
        matchPreviousDecimalPoint = null;
      }
    }

    const result: { token: Token, element: HTMLSpanElement, appendToLineFunc?: () => void }[] = [];

    let currentTop = top;
    for (let i = 0; i < text.length;) {
      let offsetOfLineBreak: number;
      if (multiLine) {
        offsetOfLineBreak = (currentTop - top) * 2;
      } else {
        currentTop = top;
        offsetOfLineBreak = 0;
      }
      this.commentRegex.lastIndex = i;
      this.stringLiteralRegex.lastIndex = i;
      this.rawStringLiteralRegex.lastIndex = i;
      this.charLiteralRegex.lastIndex = i;

      let commentPosition = findComment(this.commentRegex, text);
      let stringLiteralPosition = findStringLiteral(this.stringLiteralRegex, text);
      let rawStringLiteralPosition = findRawStringLiteral(this.rawStringLiteralRegex, text);
      let charLiteralPosition = findCharLiteral(this.charLiteralRegex, text);

      if (commentPosition !== null && (stringLiteralPosition === null || commentPosition.start < stringLiteralPosition.start) && (rawStringLiteralPosition === null || commentPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition === null || commentPosition.start < charLiteralPosition.start)) {
        if (commentPosition.isBlock) {
          const split = commentPosition.text.split(splitByLineBreak);
          let start = commentPosition.start + textIndexOffset - offsetOfLineBreak;
          for (let j = 0; j < split.length; j++) {
            result.push(Token.create(
              lines,
              decorationsData,
              currentTop++,
              insertIndex++,
              split[j],
              start,
              start + split[j].length,
              'comment',
              'comment.block',
              undefined,
              appendToLineLater
            ));
            start += split[j].length;
          }
          currentTop--;
        } else {
          result.push(Token.create(
            lines,
            decorationsData,
            currentTop,
            insertIndex++,
            commentPosition.text,
            commentPosition.start + textIndexOffset - offsetOfLineBreak,
            commentPosition.end + textIndexOffset - offsetOfLineBreak,
            'comment',
            'comment.line',
            undefined,
            appendToLineLater
          ));
        }
        i = commentPosition.end;
      } else if (stringLiteralPosition !== null && (rawStringLiteralPosition === null || stringLiteralPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition === null || stringLiteralPosition.start < charLiteralPosition.start)) {
        result.push(Token.create(
          lines,
          decorationsData,
          currentTop,
          insertIndex++,
          stringLiteralPosition.text,
          stringLiteralPosition.start + textIndexOffset - offsetOfLineBreak,
          stringLiteralPosition.end + textIndexOffset - offsetOfLineBreak,
          'string_literal',
          'literal.string',
          undefined,
          appendToLineLater,
          stringLiteralPosition.data,
        ));
        i = stringLiteralPosition.end;
      } else if (rawStringLiteralPosition !== null && (charLiteralPosition === null || rawStringLiteralPosition.start < charLiteralPosition.start)) {
        const split = rawStringLiteralPosition.text.split(splitByLineBreak);
        let start = rawStringLiteralPosition.start + textIndexOffset - offsetOfLineBreak;
        for (let j = 0; j < split.length; j++) {
          result.push(Token.create(
            lines,
            decorationsData,
            currentTop++,
            insertIndex++,
            split[j],
            start,
            start + split[j].length,
            'raw_string_literal',
            'literal.raw-string',
            undefined,
            appendToLineLater
          ));
          start += split[j].length;
        }
        currentTop--;
        i = rawStringLiteralPosition.end;
      } else if (charLiteralPosition != null) {
        result.push(Token.create(
          lines,
          decorationsData,
          currentTop,
          insertIndex++,
          charLiteralPosition.text,
          charLiteralPosition.start + textIndexOffset - offsetOfLineBreak,
          charLiteralPosition.end + textIndexOffset - offsetOfLineBreak,
          'char_literal',
          'literal.char',
          undefined,
          appendToLineLater,
          charLiteralPosition.data
        ));
        i = charLiteralPosition.end;
      } else {
        const current = words.find(s => s.start == i + textIndexOffset);
        if (current != undefined) {
          if (current.category === 'line_break') {
            currentTop++;
          } else {
            result.push(Token.create(
              lines,
              decorationsData,
              currentTop,
              insertIndex++,
              current.text,
              current.start - offsetOfLineBreak,
              current.end - offsetOfLineBreak,
              current.category,
              current.kind,
              undefined,
              appendToLineLater
            ));
          }
          i = current.end - textIndexOffset;
        } else {
          throw new SyntaxError({ content: text[i], start: i, end: i + 1 }, `Unexpected character: ${text[i]}`);
        }
      }
    }

    if (multiLine)
      return currentTop + 1;
    else
      return result;
  }

  public insertText(text: string, left: number) {
    if (left < 0)
      return;

    const top = this.lines.lines.indexOf(this);

    if (this.tokens.length === 0) {
      let textIndexOffset = 0;
      if (top !== 0) {
        for (let i = top - 1; i >= 0; i--) {
          if (this.lines.lines[i].tokens.length > 0) {
            textIndexOffset = this.lines.lines[i].tokens[this.lines.lines[i].tokens.length - 1].end;
            break;
          }
        }
      }
      Line.splitTextAndCreateToken(this.lines, this.decorationsData, text, text, top, 0, false, textIndexOffset);

      for (let i = top + 1; i < this.lines.lines.length; i++) {
        this.lines.lines[i].leftOfTokensOffset += text.length;
      }
      return;
    }

    const newTokens: Token[] = [];
    const leftAtStartEnd = left + this.tokens[0].start;
    const isHeadOfToken = this.isHeadOfToken(left, leftAtStartEnd);
    const thisText = this.text;

    let resplitStartIndex: number;
    let resplitEndIndex: number;
    let insertedText: string | undefined = undefined;
    if (isHeadOfToken) {
      resplitStartIndex = this.tokens.findIndex(token => token.start >= leftAtStartEnd) - 1;
      resplitEndIndex = resplitStartIndex + 1;
    } else {
      resplitStartIndex = this.tokens.findIndex(token => token.end > leftAtStartEnd) - 1;
      resplitEndIndex = resplitStartIndex + 1;
    }

    if (resplitStartIndex === -2) {
      resplitStartIndex = this.tokens.length - 1;
      resplitEndIndex = this.tokens.length - 1;
      insertedText = thisText.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + text;
    } else {
      if (resplitStartIndex < 0) {
        resplitStartIndex++;
        if (isHeadOfToken === false)
          resplitEndIndex++;
      }
      if (resplitEndIndex >= this.tokens.length) {
        resplitEndIndex = this.tokens.length - 1;
      }
    }

    const startOfFirstTokenAtLine = this.tokens[0].start;
    const oldDecorations = this.tokens.slice(resplitStartIndex, resplitEndIndex + 1).flatMap(token => token.decorations.map(decoration => [decoration.offset, decoration.length, decoration.colorId, decoration.type, token.start] as [number, number, string, 'selection' | undefined, number]));

    newTokens.push(...this.tokens.slice(0, resplitStartIndex));

    insertedText ??= thisText.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + text + thisText.slice(left, this.tokens[resplitEndIndex].end - this.tokens[0].start);
    for (let i = resplitStartIndex; i <= resplitEndIndex; i++) {
      this.tokens[i].delete();
    }
    const lineText = thisText.slice(0, this.tokens[resplitStartIndex].start - this.tokens[0].start) + insertedText + thisText.slice(this.tokens[resplitEndIndex].end - this.tokens[0].start);
    const resplit = Line.splitTextAndCreateToken(this.lines, this.decorationsData, insertedText, lineText, top, resplitStartIndex, true, this.tokens[resplitStartIndex].start);
    if (typeof resplit === 'number') {
      for (let i = resplit; i < this.lines.lines.length; i++) {
        this.lines.lines[i].leftOfTokensOffset += text.length;
      }
      return;
    }
    newTokens.push(...resplit.map(x => x.token));
    const insertBeforeElement = resplitEndIndex === this.tokens.length - 1 ? null : document.getElementById(`token${this.tokens[resplitEndIndex + 1].tokenId}`);
    const lineElement = document.getElementById(`line${this.lineId}`);
    if (lineElement === null)
      return;
    for (let element of resplit.map(x => x.element)) {
      lineElement.insertBefore(element, insertBeforeElement);
    }

    if (resplitEndIndex < this.tokens.length - 1) {
      this.tokens.slice(resplitEndIndex + 1).forEach(token => {
        token.start += text.length;
        token.end += text.length;
      });
      newTokens.push(...this.tokens.slice(resplitEndIndex + 1));
    }

    for (let i = top + 1; i < this.lines.lines.length; i++) {
      this.lines.lines[i].leftOfTokensOffset += text.length;
    }

    this._tokens = newTokens;

    for (let decoration of oldDecorations) {
      let start = decoration[4] - startOfFirstTokenAtLine + decoration[0];
      let end = start + decoration[1];
      if (start >= left)
        start += text.length;
      if (end >= left)
        end += text.length;

      if (start !== end) {
        Decorations.create(this.paneId, this.lines, this.decorationsData, start, top, end - start, decoration[2], decoration[3]);
      }
    }
  }

  public deleteText(left: number, length: number) {
    if (left === -1) {
      const top = this.lines.lines.indexOf(this);
      if (top === 0 || length !== 1)
        return;

      const previousLine = this.lines.lines[top - 1];
      if (previousLine.tokens.length === 0) {
        if (this.tokens.length !== 0) {
          this.moveTokens(0, this.tokens.length - 1, 0, top - 1, false);
          this.lines.lines[top - 1].leftOfTokensOffset -= this.length;
        }
      } else if (this.tokens.length !== 0) {
        const previousLineLength = previousLine.length;
        const lastTokenIndex = previousLine.tokens.length - 1;
        const lastToken = previousLine.tokens[lastTokenIndex];
        const firstToken = this.tokens[0];
        const text = lastToken.text + firstToken.text;
        const lineText = previousLine.text + this.text;

        const decorationsOfLastToken = previousLine.tokens[lastTokenIndex].decorations.map(decoration => ({ offset: decoration.offset, length: decoration.length, colorId: decoration.colorId, type: decoration.type }));

        previousLine.deleteToken(lastToken.tokenId);
        Line.splitTextAndCreateToken(this.lines, this.decorationsData, text, lineText, top - 1, previousLine.tokens.length, false, lastToken.start);
        for (let i = 1; i < this.tokens.length; i++) {
          this.tokens[i].start += this.leftOfTokensOffset - this.lines.lines[top - 1].leftOfTokensOffset;
          this.tokens[i].end += this.leftOfTokensOffset - this.lines.lines[top - 1].leftOfTokensOffset;
        }
        this.moveTokens(1, this.tokens.length - 1, previousLine.tokens.length, top - 1, false);

        for (let i = 0; i < decorationsOfLastToken.length; i++) {
          const decoration = decorationsOfLastToken[i];
          Decorations.create(this.paneId, this.lines, this.decorationsData, decoration.offset + previousLine.tokens[lastTokenIndex].start - previousLine.tokens[0].start, top - 1, decoration.length, decoration.colorId, decoration.type);
        }
        for (let i = 0; i < this.tokens[0].decorations.length; i++) {
          const decoration = this.tokens[0].decorations[i];
          Decorations.create(this.paneId, this.lines, this.decorationsData, decoration.offset + previousLineLength, top - 1, decoration.length, decoration.colorId, decoration.type);
        }
      }
      this.lines.deleteLine(top, false);
      return;
    }

    if (left < 0 || length <= 0)
      return;

    const top = this.lines.lines.indexOf(this);

    if (left === this.length && length === 1) {
      if (top === this.lines.lines.length - 1)
        return;

      const nextLine = this.lines.lines[top + 1];
      if (nextLine.tokens.length === 0) {
      } else if (this.tokens.length === 0) {
        nextLine.moveTokens(0, nextLine.tokens.length - 1, 0, top, false);
        this.lines.lines[top].leftOfTokensOffset -= nextLine.leftOfTokensOffset;
      } else {
        const previousLineLength = this.length;
        const lastTokenIndex = this.tokens.length - 1;
        const lastToken = this.tokens[lastTokenIndex];
        const firstToken = nextLine.tokens[0];
        const text = lastToken.text + firstToken.text;
        const lineText = this.text + nextLine.text;

        const decorationsOfLastToken = this.tokens[lastTokenIndex].decorations;

        this.deleteToken(lastToken.tokenId);
        Line.splitTextAndCreateToken(this.lines, this.decorationsData, text, lineText, top, this.tokens.length, false, lastToken.start);
        for (let i = 1; i < nextLine.tokens.length; i++) {
          nextLine.tokens[i].start += nextLine.leftOfTokensOffset - this.leftOfTokensOffset;
          nextLine.tokens[i].end += nextLine.leftOfTokensOffset - this.leftOfTokensOffset;
        }
        nextLine.moveTokens(1, nextLine.tokens.length - 1, this.tokens.length, top, false);

        for (let i = 0; i < decorationsOfLastToken.length; i++) {
          const decoration = decorationsOfLastToken[i];
          Decorations.create(this.paneId, this.lines, this.decorationsData, decoration.offset + this.tokens[lastTokenIndex].start - this.tokens[0].start, top, decoration.length, decoration.colorId, decoration.type);
        }
        for (let i = 0; i < nextLine.tokens[0].decorations.length; i++) {
          const decoration = nextLine.tokens[0].decorations[i];
          Decorations.create(this.paneId, this.lines, this.decorationsData, decoration.offset + previousLineLength, top, decoration.length, decoration.colorId, decoration.type);
        }
      }
      this.lines.deleteLine(top + 1, false);
      return;
    }

    const newTokens: Token[] = [];
    const leftAtStartEnd = left + this.tokens[0].start;
    const thisText = this.text;

    const firstDeleteTargetTokenIndex = this.tokens.findIndex(token => token.end > leftAtStartEnd && token.start <= leftAtStartEnd);
    if (firstDeleteTargetTokenIndex === -1)
      return;
    let lastDeleteTargetTokenIndex = this.tokens.findIndex(token => token.start >= leftAtStartEnd + length);
    if (lastDeleteTargetTokenIndex === -1)
      lastDeleteTargetTokenIndex = this.tokens.length - 1;

    if (firstDeleteTargetTokenIndex >= 2) {
      newTokens.push(...this.tokens.slice(0, firstDeleteTargetTokenIndex - 1));
    }

    const resplitStartIndex = firstDeleteTargetTokenIndex === 0 ? 0 : firstDeleteTargetTokenIndex - 1;
    const resplitEndIndex = lastDeleteTargetTokenIndex;

    const startOfFirstTokenAtLine = this.tokens[0].start;
    const oldDecorations = this.tokens.slice(resplitStartIndex, resplitEndIndex + 1).flatMap(token => token.decorations.map(decoration => [decoration.offset, decoration.length, decoration.colorId, decoration.type, token.start] as [number, number, string, 'selection' | undefined, number]));

    const deletedText = thisText.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + thisText.slice(left + length, this.tokens[resplitEndIndex].end - this.tokens[0].start);
    const lineText = thisText.slice(0, this.tokens[resplitStartIndex].start - this.tokens[0].start) + deletedText + thisText.slice(this.tokens[resplitEndIndex].end - this.tokens[0].start);
    for (let i = resplitStartIndex; i <= resplitEndIndex; i++) {
      this.tokens[i].delete();
    }
    const resplit = Line.splitTextAndCreateToken(this.lines, this.decorationsData, deletedText, lineText, top, resplitStartIndex, true, this.tokens[resplitStartIndex].start);
    if (typeof resplit === 'number') {
      for (let i = resplit; i < this.lines.lines.length; i++) {
        this.lines.lines[i].leftOfTokensOffset -= length;
      }
      return;
    }
    newTokens.push(...resplit.map(x => x.token));
    const insertBeforeElement = resplitEndIndex === this.tokens.length - 1 ? null : document.getElementById(`token${this.tokens[resplitEndIndex + 1].tokenId}`);
    const lineElement = document.getElementById(`line${this.lineId}`);
    if (lineElement === null)
      return;
    for (let element of resplit.map(x => x.element)) {
      lineElement.insertBefore(element, insertBeforeElement);
    }

    if (lastDeleteTargetTokenIndex < this.tokens.length - 1) {
      this.tokens.slice(lastDeleteTargetTokenIndex + 1).forEach(token => {
        token.start -= length
        token.end -= length;
      });
      newTokens.push(...this.tokens.slice(lastDeleteTargetTokenIndex + 1));
    }

    for (let i = top + 1; i < this.lines.lines.length; i++) {
      this.lines.lines[i].leftOfTokensOffset -= length;
    }

    this._tokens = newTokens;

    const newTextLength = this.text.length;
    for (let decoration of oldDecorations) {
      let start = decoration[4] - startOfFirstTokenAtLine + decoration[0];
      let end = start + decoration[1];
      if (start >= left + length)
        start -= length;
      if (end >= left + length)
        end -= length;

      if (start !== end && start < newTextLength) {
        if (end > newTextLength)
          end = newTextLength;
        Decorations.create(this.paneId, this.lines, this.decorationsData, start, top, end - start, decoration[2], decoration[3]);
      }
    }
  }

  private isHeadOfToken(left: number, leftAtStartEnd: number) {
    if (left === 0 || this.tokens.length === 0 || left === this.length)
      return true;
    return this.tokens.some(token => token.start === leftAtStartEnd);
  }

  public moveTokens(fromStartIndex: number, fromEndIndex: number, toIndex: number, toTop: number, changeStartEnd = true) {
    const top = this.lines.lines.indexOf(this);
    if (top === toTop)
      return;

    const originalToIndex = toIndex;
    const lineElement = document.getElementById(`line${this.lines.lines[toTop].lineId}`);
    if (lineElement === null)
      return;
    const isInsertAtEnd = toIndex === this.lines.lines[toTop].tokens.length;

    let leftAtStartEnd: number = 0;
    if (this.lines.lines[toTop].tokens.length > 0 && this.lines.lines[toTop].tokens[toIndex]) {
      leftAtStartEnd = this.lines.lines[toTop].tokens[toIndex].start;
    } else {
      for (let i = toTop; i >= 0; i--) {
        if (this.lines.lines[i].tokens.length > 0) {
          leftAtStartEnd = this.lines.lines[i].tokens[this.lines.lines[i].tokens.length - 1].end + this.lines.lines[toTop].tokens.slice(0, toIndex).reduce((acc, token) => acc + token.text.length, 0);
          break;
        }
      }
    }

    let length = 0;
    for (let token of this.tokens.slice(fromStartIndex, fromEndIndex + 1)) {
      token.moveLineInfo(toTop);
      this.lines.lines[toTop].tokens.splice(toIndex++, 0, token);
      if (changeStartEnd) {
        token.start = leftAtStartEnd + length;
        token.end = leftAtStartEnd + length + token.text.length;
      }
      length += token.text.length;

      const tokenElement = document.getElementById(`token${token.tokenId}`);
      if (tokenElement === null)
        return;
      tokenElement.remove();
      if (isInsertAtEnd || originalToIndex === lineElement.childNodes.length - 1)
        lineElement.appendChild(tokenElement);
      else
        lineElement.insertBefore(tokenElement, lineElement.childNodes[originalToIndex + 1]);
    }
    this._tokens.splice(fromStartIndex, fromEndIndex - fromStartIndex + 1);

    if (changeStartEnd) {
      for (let i = toIndex + fromEndIndex - fromStartIndex; i < this.lines.lines[toTop].tokens.length; i++) {
        this.lines.lines[toTop].tokens[i].start += length;
        this.lines.lines[toTop].tokens[i].end += length;
      }

      for (let i = fromStartIndex; i < this.tokens.length; i++) {
        this.tokens[i].start -= length;
        this.tokens[i].end -= length;
      }

      if (top > toTop) {
        for (let i = toTop + 1; i <= top; i++) {
          this.lines.lines[i].leftOfTokensOffset += length;
        }
      } else {
        for (let i = top; i < toTop; i++) {
          this.lines.lines[i].leftOfTokensOffset -= length;
        }
      }
    }
  }

  public startNewLine(left: number) {
    const top = this.lines.lines.indexOf(this);
    if (left === 0) {
      this.lines.insertLine(top + 1);
      if (this.tokens.length !== 0) {
        this.moveTokens(0, this.tokens.length - 1, 0, top + 1, false);
      }
      this.lines.lines[top + 1].leftOfTokensOffset = this.leftOfTokensOffset;
      this.caret.set(0, top + 1);
      return;
    } else if (left === this.length) {
      this.lines.insertLine(top + 1);
      this.lines.lines[top + 1].leftOfTokensOffset = this.leftOfTokensOffset;
      this.caret.set(0, top + 1);
      return;
    }

    const tokenFromLeft = this.getTokenFromLeft(left);
    if (tokenFromLeft === null)
      return;
    if (tokenFromLeft.isHeadOfToken) {
      this.lines.insertLine(top + 1);
      this.moveTokens(tokenFromLeft.index, this.tokens.length - 1, 0, top + 1, false);
      this.lines.lines[top + 1].leftOfTokensOffset = this.leftOfTokensOffset;
    } else {
      const target = this.tokens[tokenFromLeft.index];
      const targetText = target.text;

      let targetInNextLineText: string;
      if (this.tokens.length === tokenFromLeft.index + 1) {
        targetInNextLineText = targetText.slice(left - tokenFromLeft.leftOfTokenAtLine);

        const targetInThisLineText = targetText.slice(0, left - tokenFromLeft.leftOfTokenAtLine);
        const targetStart = target.start;
        this.deleteToken(target.tokenId);

        Line.splitTextAndCreateToken(this.lines, this.decorationsData, targetInThisLineText, targetInThisLineText, top, tokenFromLeft.index, false, targetStart);

        this.lines.insertLine(top + 1, targetInNextLineText);
      } else {
        targetInNextLineText = targetText.slice(left - tokenFromLeft.leftOfTokenAtLine) + this.tokens[tokenFromLeft.index + 1].text;

        const afterDeleteTokenId = this.tokens[tokenFromLeft.index + 1].tokenId;

        this.lines.insertLine(top + 1, targetInNextLineText);

        const targetInThisLineText = targetText.slice(0, left - tokenFromLeft.leftOfTokenAtLine);

        let leftAtStartEnd = 0;
        for (let i = top; i >= 0; i--) {
          if (this.lines.lines[i].tokens.length > 0) {
            leftAtStartEnd = this.lines.lines[i].tokens[0].start + left;
            break;
          }
        }

        this.moveTokens(tokenFromLeft.index + 2, this.tokens.length - 1, this.lines.lines[top + 1].tokens.length, top + 1, false);

        Line.splitTextAndCreateToken(this.lines, this.decorationsData, targetInThisLineText, targetInThisLineText, top, tokenFromLeft.index, false, target.start);

        this.deleteToken(afterDeleteTokenId);
        this.deleteToken(target.tokenId);

        let length = 0;
        for (let i = 0; i < this.lines.lines[top + 1].tokens.length; i++) {
          this.lines.lines[top + 1].tokens[i].start = leftAtStartEnd - left + this.length + length;
          this.lines.lines[top + 1].tokens[i].end = leftAtStartEnd - left + this.length + length + this.lines.lines[top + 1].tokens[i].text.length;
          length += this.lines.lines[top + 1].tokens[i].text.length;
        }
      }
    }
    this.caret.set(0, top + 1);
  }

  private deleteToken(tokenId: number) {
    const index = this.tokens.findIndex(token => token.tokenId === tokenId);
    if (index === -1)
      return;
    this.tokens[index].delete();
    this.tokens.splice(index, 1);
  }

  private getTokenFromLeft(left: number): { token: Token, leftOfTokenAtLine: number, index: number, isHeadOfToken: boolean } | null {
    let length = 0;
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (length + token.text.length > left) {
        return { token, leftOfTokenAtLine: length, index: i, isHeadOfToken: length === left };
      }
      length += token.text.length;
    }
    return null;
  }
}
interface BaseToken {
  tokenId: number;
  text: string;
  start: number;
  end: number;
  category: Category | undefined;
  kind: Kind | undefined;
  data?: any;
}
class Token implements BaseToken {
  public static lastTokenId: number = 0;

  public readonly tokenId: number;
  public readonly element: HTMLSpanElement | undefined;
  private _text: string = '';
  private _start: number;
  private _end: number;
  public category: Category;
  private _kind: Kind | undefined = undefined;
  public decorations: Decoration[] = [];
  public data?: any;
  public line: Line;

  private constructor(private lines: Lines, private decorationsData: DecorationsData, tokenId: number, element: HTMLSpanElement | undefined, text: string, start: number, end: number, category: Category, kind: Kind | undefined, decorations: Decoration[] | undefined, data: any, line: Line) {
    this.tokenId = tokenId;
    this.element = element;
    this._text = text;
    this._start = start;
    this._end = end;
    this.category = category;
    this.kind = kind;
    if (decorations !== undefined)
      this.decorations = decorations;
    this.data = data;
    this.line = line;
  }

  /**
   * トークンを作成する
   * @param top 行番号
   * @param insertIndex 行の中での挿入位置
   * @param text トークンの文字列（事前にトークン単位に文字列を分割しておくこと）
   * @param start 全文字列の中での開始位置
   * @param end 全文字列の中での終了位置
   * @param category 
   * @param kind 
   * @param decorations 作成するトークンのdecorationsに追加するDecoration
   * @param appendToLineLater 後で戻り値に含まれる関数を使用して行に追加するか（関数実行時の環境でトークンが作成される）
   * @param data StringLiteralやCharLiteral等に使用される、トークンに付加しておくデータ
   * @returns token: 作成されたトークン, element: 作成されたトークンのHTML要素, appendToLineFunc: 行にトークンを追加する関数（appendToLineLaterがtrueの場合のみ）
   */
  public static create(lines: Lines, decorationsData: DecorationsData, top: number, insertIndex: number | null, text: string, start: number, end: number, category: Category, kind: Kind | undefined, decorations?: Decoration[], appendToLineLater = false, data?: any): { token: Token, element: HTMLSpanElement, appendToLineFunc?: () => void } {
    const tokenId = Token.lastTokenId++;
    const element = document.createElement('span');
    element.id = `token${tokenId}`;
    element.classList.add('token');
    const textElement = document.createElement('span');
    textElement.textContent = text;
    element.appendChild(textElement);

    const token = new Token(lines, decorationsData, tokenId, element, text, start - lines.lines[top].leftOfTokensOffset, end - lines.lines[top].leftOfTokensOffset, category, kind, decorations, data, lines.lines[top]);
    const tokenIdAtInsertIndex = (insertIndex === null || lines.lines[top].tokens.length <= insertIndex) ? null : lines.lines[top].tokens[insertIndex].tokenId;

    if (appendToLineLater) {
      if (tokenIdAtInsertIndex === null)
        return {
          token,
          element,
          appendToLineFunc: () => {
            lines.lines[top].tokens.push(token);
            document.getElementById(`line${lines.lines[top].lineId}`)?.appendChild(element);
          }
        };
      else
        return {
          token,
          element,
          appendToLineFunc: () => {
            lines.lines[top].tokens.splice(insertIndex!, 0, token);
            document.getElementById(`line${lines.lines[top].lineId}`)?.insertBefore(element, document.getElementById(`token${tokenIdAtInsertIndex}`)!);
          }
        };
    } else {
      lines.lines[top].tokens.splice(insertIndex === null ? lines.lines[top].tokens.length : insertIndex, 0, token);
      if (tokenIdAtInsertIndex === null)
        document.getElementById(`line${lines.lines[top].lineId}`)?.appendChild(element);
      else
        document.getElementById(`line${lines.lines[top].lineId}`)?.insertBefore(element, document.getElementById(`token${tokenIdAtInsertIndex}`)!);
      return { token, element };
    }
  }

  public get text() {
    return this._text;
  }
  public set text(text: string) {
    if (text !== this._text) {
      this._text = text;
      if (this.element !== undefined) {
        this.element.children[this.element.children.length - 1].textContent = text;
        if (text === '@')
          this.element.style.color = accessibilityKeywordColor;
      }
    }
  }

  public get start() {
    return this._start + this.line.leftOfTokensOffset;
  }
  public set start(start: number) {
    this._start = start - this.line.leftOfTokensOffset;
  }

  public get end() {
    return this._end + this.line.leftOfTokensOffset;
  }
  public set end(end: number) {
    this._end = end - this.line.leftOfTokensOffset;
  }

  public get kind() {
    return this._kind;
  }
  public set kind(kind: Kind | undefined) {
    this._kind = kind;
    this.element!.style.color = this.text === '@' ? accessibilityKeywordColor : this.decorationsData.colors.find(color => color.id === kind)?.color ?? '';
  }

  public delete() {
    this.element?.remove();
    for (let decoration of this.decorations) {
      decoration.delete();
    }
  }

  public deleteSelectionDecoration() {
    for (let decoration of this.decorations) {
      if (decoration.type === 'selection') {
        decoration.delete();
        return;
      }
    }
  }

  public moveLineInfo(top: number) {
    this.line = this.lines.lines[top];
  }
}

class DecorationsData {
  colors: {
    id: Kind;
    color: string;
  }[] = [];
  backgroundColors: {
    id: string;
    color: string;
  }[] = [{ id: SELECTION_COLOR_ID, color: '#46f9ff55' }];
}

type DecorationType = 'selection' | 'error' | undefined;
class Decorations {
  public static create(paneId: number, lines: Lines, decorationsData: DecorationsData, left: number, top: number, length: number, colorId?: string, type?: DecorationType) {
    if (lines.lines[top].tokens.length === 0 || length <= 0)
      return;

    if (type === 'error') {
      Decoration.createError(paneId, lines, decorationsData, left, top, length);
      return;
    }

    const leftAtStartEnd = left + lines.lines[top].tokens[0].start;

    const firstTokenIndex = lines.lines[top].tokens.findIndex(token => token.end > leftAtStartEnd);
    if (firstTokenIndex === -1)
      return;
    let lastTokenIndex = findLastIndex(lines.lines[top].tokens, token => token.start < leftAtStartEnd + length);
    const decorations: Decoration[] = [];
    if (lastTokenIndex === -1) {
      lastTokenIndex = lines.lines[top].tokens.length - 1;
    }

    if (firstTokenIndex === lastTokenIndex) {
      decorations.push(Decoration.create(paneId, decorationsData, lines.lines[top].tokens[firstTokenIndex], leftAtStartEnd - lines.lines[top].tokens[firstTokenIndex].start, length, colorId, type).decoration);
    } else {
      decorations.push(Decoration.create(paneId, decorationsData, lines.lines[top].tokens[firstTokenIndex], leftAtStartEnd - lines.lines[top].tokens[firstTokenIndex].start, lines.lines[top].tokens[firstTokenIndex].text.length - (leftAtStartEnd - lines.lines[top].tokens[firstTokenIndex].start), colorId, type).decoration);
      for (let i = firstTokenIndex + 1; i < lastTokenIndex; i++)
        decorations.push(Decoration.create(paneId, decorationsData, lines.lines[top].tokens[i], 0, lines.lines[top].tokens[i].text.length, colorId, type).decoration);
      decorations.push(Decoration.create(paneId, decorationsData, lines.lines[top].tokens[lastTokenIndex], 0, leftAtStartEnd + length - lines.lines[top].tokens[lastTokenIndex].start, colorId, type).decoration);
    }
  }
}
class Decoration {
  private static lastDecorationId = 0;

  private readonly paneId: number;
  private readonly decorationsData: DecorationsData;

  public readonly decorationId: number;
  public readonly element: HTMLSpanElement;
  private _token: Token | undefined;
  private _offset: number;
  private _length: number;
  private _colorId?: string;
  public type: DecorationType;

  private constructor(paneId: number, decorationsData: DecorationsData, decorationId: number, element: HTMLSpanElement, token: Token, offset: number, length: number, colorId?: string, type?: DecorationType) {
    this.paneId = paneId;
    this.decorationsData = decorationsData;
    this.decorationId = decorationId;
    this.element = element;
    this.token = token;
    this._offset = offset;
    this._length = length;
    this._colorId = colorId;
    this.type = type;
  }

  public static create(paneId: number, decorationsData: DecorationsData, token: Token, offset: number, length: number, colorId?: string, type?: 'selection' | undefined, extensionOfLineBreak = false): { decoration: Decoration, element: HTMLSpanElement } {
    if (token.element === undefined)
      throw new UnhandledError();

    let decorationId: number;
    let element: HTMLSpanElement;
    let existingDecoration: Element | null = null;
    let createdNewElement = false;
    if (type === 'selection' && ((existingDecoration = token.element.querySelector('.selection')), existingDecoration !== null)) {
      element = existingDecoration as HTMLSpanElement;
      decorationId = parseInt(element.id.replace('decoration', ''));
    } else {
      createdNewElement = true;
      element = document.createElement('span');
      decorationId = Decoration.lastDecorationId++;
      element.id = `decoration${decorationId}`;

      element.classList.add('decoration');

      if (type === 'selection')
        element.classList.add('selection');

      element.style.background = decorationsData.backgroundColors.find(color => color.id === colorId)?.color ?? '';
    }

    if (extensionOfLineBreak)
      element.classList.add('extensionOfLineBreak');
    else
      element.classList.remove('extensionOfLineBreak');

    if (offset === 0)
      element.style.left = '0';
    else
      element.style.left = `${measureTextWidth(paneId, token.text.slice(0, offset))}px`;
    if (length === 0)
      element.style.width = '0';
    else
      element.style.width = `${measureTextWidth(paneId, token.text.slice(offset, offset + length))}px`;

    if (createdNewElement) {
      token.element.prepend(element);
    }

    const decoration = new Decoration(paneId, decorationsData, decorationId, element, token, offset, length, colorId, type);

    token.decorations.push(decoration);
    return { decoration, element };
  }
  public static createError(paneId: number, lines: Lines, decorationsData: DecorationsData, left: number, top: number, length: number) {
    const element = document.createElement('span');
    const decorationId = Decoration.lastDecorationId++;
    element.id = `decoration${decorationId}`;

    element.classList.add('decoration', 'error');

    const firstToken = lines.lines[top].tokens.find(token => token.end > left + lines.lines[top].tokens[0].start);
    if (firstToken === undefined)
      return;
    const offset = left - firstToken.start + lines.lines[top].tokens[0].start;

    element.style.left = `${measureTextWidth(paneId, firstToken.text.slice(0, offset))}px`;
    const width = measureTextWidth(paneId, lines.lines[top].text.slice(offset, offset + length)) * 1.25;
    element.style.width = `${width}px`;

    const spaceCharWidth = measureTextWidth(paneId, ' ');
    element.textContent = ' '.repeat(Math.ceil(width / spaceCharWidth));

    firstToken.element!.prepend(element);

    const decoration = new Decoration(paneId, decorationsData, decorationId, element, firstToken, offset, length, undefined, 'error');

    firstToken.decorations.push(decoration);
    return { decoration, element };
  }

  public delete() {
    this.element.remove();
    this.token.decorations.splice(this.token.decorations.indexOf(this), 1);
  }

  public get token() {
    return this._token!;
  }
  public set token(token: Token) {
    this._token = token;
  }

  public get offset() {
    return this._offset;
  }
  public set offset(offset: number) {
    this._offset = offset;
    if (this.token.element !== undefined) {
      if (offset === 0)
        this.element.style.left = '0';
      else
        this.element.style.left = `${measureTextWidth(this.paneId, this.token.text.slice(this.offset, this.offset + this.length))}px`;
    }
  }

  public get length() {
    return this._length;
  }
  public set length(length: number) {
    this._length = length;
    if (length === 0)
      this.element.style.width = '0';
    else
      this.element.style.width = `${measureTextWidth(this.paneId, this.token.text.slice(this.offset, this.offset + this.length))}px`;
  }

  public get colorId() {
    return this._colorId;
  }
  public set colorId(colorId: string | undefined) {
    this._colorId = colorId;
    this.element.style.background = this.decorationsData.backgroundColors.find(color => color.id === colorId)?.color ?? '';
  }

  public changeOffsetAndLength(offset: number, length: number) {
    this._offset = offset;
    this._length = length;
    if (this.token.element !== undefined) {
      this.element.style.left = `${measureTextWidth(this.paneId, this.token.text.slice(0, offset))}px`;
      this.element.style.width = `${measureTextWidth(this.paneId, this.token.text.slice(offset, offset + length))}px`;
    }
  }
}

class Dialog {
  readonly element: HTMLDivElement;

  constructor(title: string, content: string, buttons: { text: string, onClick: () => void }[]) {
    const template = document.getElementById('dialogTemplate') as HTMLTemplateElement;
    this.element = template.content.firstElementChild!.cloneNode(true) as HTMLDivElement;

    this.element.getElementsByClassName('dialogTitle')[0].textContent = title;
    this.element.getElementsByClassName('dialogContent')[0].textContent = content;
    const dialogButtons = this.element.getElementsByClassName('dialogButtons')[0];
    dialogButtons.innerHTML = '';
    for (let button of buttons) {
      const newButton = document.createElement('button');
      newButton.textContent = button.text;
      newButton.onclick = button.onClick;
      dialogButtons.appendChild(newButton);
    }
  }

  public async show() {
    document.getElementById('contentSpace')?.appendChild(this.element);
    await repaint();
  }
  public hide() {
    this.element.remove();
  }
}


function calculateMousePosition(paneId: number, lines: Lines, e: MouseEvent): null | { left: number, top: number } {
  const pane = document.getElementById(`pane${paneId}`);
  if (pane === null)
    return null;

  const editorSpaceSize = pane.getBoundingClientRect();
  if (e.clientX < editorSpaceSize.left || e.clientX > editorSpaceSize.left + pane.clientWidth || e.clientY < editorSpaceSize.top || e.clientY > editorSpaceSize.top + pane.clientHeight)
    return null;

  const x = e.clientX - editorSpaceSize.left + pane.scrollLeft;
  const y = e.clientY - editorSpaceSize.top + pane.scrollTop;
  const lineHeightInPixel = parseFloat(getComputedStyle(document.querySelector('.line:not(#lineToMeasure)')!).height!.replace('px', ''));
  const top = Math.floor(y / lineHeightInPixel);

  if (top >= lines.lines.length) {
    return { left: lines.lines[lines.lines.length - 1].length, top: lines.lines.length - 1 };
  } else {
    const text = lines.lines[top].text;
    const length = lines.lines[top].length;

    const styleOfLineNumberElement = getComputedStyle(document.querySelector('.lineNumber')!);
    const marginLeft = parseFloat(styleOfLineNumberElement.width.replace('px', '')) + parseFloat(styleOfLineNumberElement.paddingRight.replace('px', ''));

    if (x <= marginLeft)
      return { left: 0, top };

    const textWidth = measureTextWidth(paneId, text);
    const lastCharWidth = measureTextWidth(paneId, text.slice(length - 1, length));
    if (textWidth + marginLeft <= x + lastCharWidth / 2)
      return { left: length, top };

    let left = 0;
    let right = length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const width = measureTextWidth(paneId, text.slice(0, mid)) + marginLeft;
      const lastCharWidth = mid > 0 ? measureTextWidth(paneId, text.slice(mid - 1, mid)) : 0;

      if (width > x + lastCharWidth / 2) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    return { left: left - 1, top };
  }
}

function measureTextWidth(paneId: number, text: string) {
  let lineToMeasure = document.querySelector(`#pane${paneId} #lineToMeasure`);
  if (lineToMeasure === null) {
    lineToMeasure = document.createElement('div');
    lineToMeasure.id = 'lineToMeasure';
    lineToMeasure.classList.add('line');
    document.getElementById('editorSpace')?.appendChild(lineToMeasure);
  }
  lineToMeasure.textContent = text.replace(/ /g, ' ');
  return lineToMeasure.getBoundingClientRect().width;
}

function findComment(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures === null) return null;
  const length = captures.slice(1).reduce((a, b) => a + (b ? b.length : 0), 0)
  return {
    text: str.slice(captures.index, captures.index + length),
    start: captures.index,
    end: captures.index + length,
    isBlock: captures[3] !== undefined
  };
}
function findStringLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures === null) return null;
  let text, start, end, data;
  if (captures.length === 1) {
    text = captures[0];
    start = captures.index;
    end = captures.index + captures[0].length;
    data = text;
  } else {
    text = data = captures.slice(1).join('');
    let length = captures.slice(1).reduce((a, b) => a + (b ? b.length : 0), 0);
    if ((text.startsWith('@') || text.startsWith('$')) === false && captures.length >= 10 && captures[9] === undefined) {
      data += '"';
    }
    start = captures.index;
    end = captures.index + length;
  }
  return { text, start, end, data };
}
const escapesInRawStringLiteral = /\\`/g;
function findRawStringLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures === null) return null;
  let text = captures[0];
  if (text.endsWith('`')) {
    const startBackQuoteIndex = text.indexOf('`');
    const endBackQuoteIndex = text.lastIndexOf('`');
    let safeMultiQuoteCount = 3;
    for (let i = 3; i < Number.MAX_SAFE_INTEGER; i++) {
      if (text.indexOf('"'.repeat(i)) === -1) {
        safeMultiQuoteCount = i;
        break;
      }
    }
    text = text.slice(0, startBackQuoteIndex) + '"'.repeat(safeMultiQuoteCount) + text.slice(startBackQuoteIndex + 1, endBackQuoteIndex) + '"'.repeat(safeMultiQuoteCount);
    text = text.replace(escapesInRawStringLiteral, '`');
  }
  return {
    text,
    start: captures.index,
    end: captures.index + captures[0].length
  };
}
function findCharLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures === null) return null;
  let text = captures[2];
  return {
    text: "'" + text + (captures[3] ? "'" : ''),
    start: captures.index,
    end: captures.index + text.length + (captures[3] === undefined ? 1 : 2),
    data: "'" + text + "'",
  };
}
function findNumberLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures === null) return null;
  return {
    text: captures[0],
    start: captures.index,
    end: captures.index + captures[0].length,
  };
}


function repeatAction(repeatActionTimeout: number | null, repeatActionInterval: number | null, action: () => void, intervalToRepeat: number = 750, intervalBetweenActions: number = 100) {
  stopRepeatAction(repeatActionTimeout, repeatActionInterval);
  action();
  repeatActionTimeout = setTimeout(() => {
    repeatActionInterval = setInterval(action, intervalBetweenActions);
  }, intervalToRepeat);
}
function stopRepeatAction(repeatActionTimeout: number | null, repeatActionInterval: number | null) {
  if (repeatActionTimeout !== null) {
    clearTimeout(repeatActionTimeout);
    repeatActionTimeout = null;
  }
  if (repeatActionInterval !== null) {
    clearInterval(repeatActionInterval);
    repeatActionInterval = null;
  }
}
