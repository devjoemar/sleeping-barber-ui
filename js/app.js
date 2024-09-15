document.addEventListener("DOMContentLoaded", () => {
    const socket = new SockJS('http://localhost:8081/barbershop-websocket');
    const stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
        console.log('Connected to the backend WebSocket');

        stompClient.subscribe('/topic/events', (message) => {
            const event = JSON.parse(message.body);
            handleEvent(event);
        });
    }, (error) => {
        console.error('Error connecting to WebSocket:', error);
    });

    const addCustomerBtn = document.getElementById('add-customer-btn');
    const waitingRoomCapacityElement = document.getElementById('waiting-room-capacity');
    const waitingChairsElement = document.getElementById('waiting-chairs');
    const barberChairsElement = document.getElementById('barber-chairs');

    let waitingRoomCapacity = 0;
    const maxWaitingRoomCapacity = 10;
    let numberOfBarberChairs = 0;

    // Fetch the number of barber chairs from the backend
    fetch('http://localhost:8081/api/barber-chairs')
        .then(response => response.json())
        .then(data => {
            numberOfBarberChairs = data;
            initializeBarberChairs(numberOfBarberChairs);
        })
        .catch(error => {
            console.error('Error fetching barber chairs:', error);
        });

    // Event listener for Add Customer button
    addCustomerBtn.addEventListener('click', () => {
        fetch('http://localhost:8081/api/add-customer', {
            method: 'POST'
        })
        .then(response => {
            if (response.ok) {
                console.log('Customer added');
            } else {
                console.error('Error adding customer');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    function handleEvent(event) {
        const { eventType, entityId, chairId, customerId } = event;

        switch (eventType) {
            case 'customerWaiting':
                addCustomerToWaitingRoom(entityId);
                break;
            case 'customerLeftWaitingRoom':
                removeCustomerFromWaitingRoom(entityId);
                break;
            case 'customerLeft':
                // Do not call removeCustomerFromWaitingRoom here since the customer never entered
                console.log(`Customer ${entityId} left because the waiting room is full.`);
                break;
            case 'customerSeated':
                // Do not remove customer from waiting room here, it's already handled
                moveCustomerToBarberChair(entityId, chairId);
                break;
            case 'customerFinished':
                removeCustomerFromBarberChair(entityId, chairId);
                break;
            case 'barberStarted':
                barberStartedHaircut(entityId, chairId, customerId);
                break;
            case 'barberFinished':
                barberFinishedHaircut(entityId, chairId);
                break;
            default:
                console.warn('Unknown event type:', eventType);
        }
    }

    function initializeBarberChairs(number) {
        for (let i = 0; i < number; i++) {
            const chairElement = document.createElement('div');
            chairElement.classList.add('barber-chair');
            chairElement.id = `barber-chair-${i}`;
            chairElement.textContent = `Chair ${i}`;
            barberChairsElement.appendChild(chairElement);
        }
    }

    function addCustomerToWaitingRoom(customerId) {
        waitingRoomCapacity++;
        updateWaitingRoomCapacity();

        const customerElement = createCustomerElement(customerId);
        waitingChairsElement.appendChild(customerElement);

        // Disable Add Customer button if waiting room is full
        if (waitingRoomCapacity >= maxWaitingRoomCapacity) {
            addCustomerBtn.disabled = true;
        }
    }

    function removeCustomerFromWaitingRoom(customerId) {
        const customerElement = document.getElementById(`customer-${customerId}`);
        if (customerElement && waitingChairsElement.contains(customerElement)) {
            waitingChairsElement.removeChild(customerElement);
        }
        // Always decrement waitingRoomCapacity when a customer leaves the waiting room
        waitingRoomCapacity--;
        updateWaitingRoomCapacity();

        // Enable Add Customer button if there's room
        if (waitingRoomCapacity < maxWaitingRoomCapacity) {
            addCustomerBtn.disabled = false;
        }
    }

    function moveCustomerToBarberChair(customerId, chairId) {
        // Do not remove customer from waiting room here; it's handled by 'customerLeftWaitingRoom' event
        const customerElement = document.getElementById(`customer-${customerId}`);
        const chairElement = document.getElementById(`barber-chair-${chairId}`);
        if (customerElement && chairElement) {
            chairElement.appendChild(customerElement);
        }
    }

    function removeCustomerFromBarberChair(customerId, chairId) {
        const chairElement = document.getElementById(`barber-chair-${chairId}`);
        const customerElement = document.getElementById(`customer-${customerId}`);
        if (customerElement && chairElement.contains(customerElement)) {
            chairElement.removeChild(customerElement);
        }
    }

    function barberStartedHaircut(barberId, chairId, customerId) {
        const chairElement = document.getElementById(`barber-chair-${chairId}`);
        if (chairElement) {
            chairElement.classList.add('cutting');
            // Display which customer is being served
            const customerElement = document.getElementById(`customer-${customerId}`);
            if (customerElement && !chairElement.contains(customerElement)) {
                chairElement.appendChild(customerElement);
            }
            // Update chair text to show customer ID
            chairElement.textContent = `Chair ${chairId}\nServing C${customerId}`;
        }
    }

    function barberFinishedHaircut(barberId, chairId) {
        const chairElement = document.getElementById(`barber-chair-${chairId}`);
        if (chairElement) {
            chairElement.classList.remove('cutting');
            // Remove customer from barber chair
            const customerElement = chairElement.querySelector('.customer');
            if (customerElement) {
                chairElement.removeChild(customerElement);
            }
            // Reset chair text
            chairElement.textContent = `Chair ${chairId}`;
        }
    }

    function createCustomerElement(customerId) {
        const customerElement = document.createElement('div');
        customerElement.classList.add('customer');
        customerElement.id = `customer-${customerId}`;
        customerElement.textContent = `C${customerId}`;
        return customerElement;
    }

    function updateWaitingRoomCapacity() {
        waitingRoomCapacityElement.textContent = waitingRoomCapacity;
    }
});
