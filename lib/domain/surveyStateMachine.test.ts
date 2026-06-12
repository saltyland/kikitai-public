import { describe, expect, it } from 'vitest';
import { SurveyStateMachine } from './surveyStateMachine';

describe('SurveyStateMachine.isStatus', () => {
  it('正しいステータス値を受理する', () => {
    expect(SurveyStateMachine.isStatus('draft')).toBe(true);
    expect(SurveyStateMachine.isStatus('open')).toBe(true);
    expect(SurveyStateMachine.isStatus('closed')).toBe(true);
  });

  it('未知の文字列は拒否する', () => {
    expect(SurveyStateMachine.isStatus('archived')).toBe(false);
    expect(SurveyStateMachine.isStatus('')).toBe(false);
  });
});

describe('SurveyStateMachine.canTransition', () => {
  it('draft→open（公開）は許可', () => {
    expect(SurveyStateMachine.canTransition('draft', 'open')).toBe(true);
  });

  it('open→closed（締切）は許可', () => {
    expect(SurveyStateMachine.canTransition('open', 'closed')).toBe(true);
  });

  it('closed→open（再オープン）は禁止', () => {
    expect(SurveyStateMachine.canTransition('closed', 'open')).toBe(false);
  });

  it('draft→closed（公開せず締切）は禁止', () => {
    expect(SurveyStateMachine.canTransition('draft', 'closed')).toBe(false);
  });

  it('同一状態への遷移は禁止', () => {
    expect(SurveyStateMachine.canTransition('open', 'open')).toBe(false);
  });
});

describe('SurveyStateMachine.assertTransition', () => {
  it('許可された遷移は例外を投げない', () => {
    expect(() => SurveyStateMachine.assertTransition('draft', 'open')).not.toThrow();
  });

  it('禁止された遷移は日本語メッセージの例外を投げる', () => {
    expect(() => SurveyStateMachine.assertTransition('closed', 'open')).toThrow(
      /許可されていません/
    );
  });
});
