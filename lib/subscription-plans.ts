export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    usd: number;
    inr: number;
  };
  limits: {
    postsPerMonth: number;
    postsPerDay?: number;
  };
  features: string[];
}

// Define the subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Basic plan for occasional bloggers",
    price: {
      usd: 0,
      inr: 0
    },
    limits: {
      postsPerMonth: 5,
      postsPerDay: 2
    },
    features: [
      "5 blog posts per month",
      "Basic AI content generation",
      "Standard blog templates"
    ]
  },
  {
    id: "standard",
    name: "Standard",
    description: "Perfect for regular content creators",
    price: {
      usd: 5,
      inr: 400
    },
    limits: {
      postsPerMonth: 150,
      postsPerDay: 10
    },
    features: [
      "150 blog posts per month",
      "Advanced AI content generation",
      "Priority support",
      "Custom blog templates"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    description: "For professional bloggers and businesses",
    price: {
      usd: 9,
      inr: 700
    },
    limits: {
      postsPerMonth: 300,
      postsPerDay: 20
    },
    features: [
      "300 blog posts per month",
      "Premium AI content generation",
      "Priority support",
      "Custom blog templates",
      "Analytics dashboard",
      "SEO optimization tools"
    ]
  }
];

export const getSubscriptionPlan = (planId: string): SubscriptionPlan => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) {
    return SUBSCRIPTION_PLANS[0]; // Return free plan as default
  }
  return plan;
};

// Function to get the appropriate plan ID based on usage
export const getAppropriateUpgradePlan = (currentUsage: number): SubscriptionPlan | null => {
  for (const plan of SUBSCRIPTION_PLANS) {
    if (plan.id !== "free" && plan.limits.postsPerMonth > currentUsage) {
      return plan;
    }
  }
  return null; // No suitable upgrade found (user already on highest plan)
};