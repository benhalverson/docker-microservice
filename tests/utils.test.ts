import 'jest';
import { getData } from '../src/utils';

// test the getData function returns some data
describe('getData',  () => {
  it('should return an object', async() => {
    const data = await getData();
    expect(typeof data).toBe('object');
  });
});



