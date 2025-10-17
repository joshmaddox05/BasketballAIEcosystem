describe('Mobile App Basic Tests', () => {
  it('should perform basic calculations', () => {
    expect(1 + 1).toBe(2);
    expect(3 * 4).toBe(12);
  });

  it('should handle strings correctly', () => {
    const appName = 'Basketball AI';
    expect(appName).toBeDefined();
    expect(appName.length).toBeGreaterThan(0);
    expect(appName.includes('Basketball')).toBe(true);
  });

  it('should work with objects', () => {
    const config = {
      name: 'Basketball AI',
      version: '1.0.0',
      platform: 'mobile'
    };
    
    expect(config.name).toBe('Basketball AI');
    expect(config.version).toBe('1.0.0');
    expect(config.platform).toBe('mobile');
  });
});
