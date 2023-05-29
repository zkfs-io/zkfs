import type { Mina } from 'snarkyjs';

type Events = Awaited<ReturnType<typeof Mina.fetchEvents>>;

export default Events;
