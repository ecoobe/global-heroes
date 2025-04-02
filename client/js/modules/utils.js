export const DOMHelper = {
	validateElements(elements) {
	  Object.entries(elements).forEach(([name, element]) => {
		if (!element) throw new Error(`DOM element not found: ${name}`);
	  });
	}
  };
  
  export const ErrorHandler = {
	show(errorElement, message, timeout = 5000) {
	  errorElement.textContent = message;
	  errorElement.style.display = 'block';
	  setTimeout(() => {
		errorElement.style.display = 'none';
	  }, timeout);
	}
  };