describe('Basic utilities', () => {
  it('should perform basic math operations', () => {
    expect(2 + 2).toBe(4);
    expect(5 * 3).toBe(15);
    expect(10 - 3).toBe(7);
  });

  it('should work with strings', () => {
    const greeting = 'Hello';
    const name = 'Basketball AI';
    expect(`${greeting} ${name}`).toBe('Hello Basketball AI');
  });

  it('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers.length).toBe(5);
    expect(numbers[0]).toBe(1);
    expect(numbers.includes(3)).toBe(true);
  });
});
