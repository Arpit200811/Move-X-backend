import { Request, Response } from "express";

export const getTicketsData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = {
      movies: {
        featured: [
          {
            id: "f1",
            title: "Dune: Part Two",
            genre: "Sci-Fi • Action",
            rating: "8.8",
            votes: "124K",
            img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
            is3D: true,
          },
          {
            id: "f2",
            title: "Oppenheimer",
            genre: "Drama • History",
            rating: "9.2",
            votes: "300K",
            img: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
            is3D: false,
          },
        ],
        showing: [
          {
            id: "m1",
            title: "Kung Fu Panda 4",
            genre: "Animation • Comedy",
            rating: "7.5",
            votes: "45K",
            img: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&q=80",
            is3D: true,
          },
          {
            id: "m2",
            title: "Godzilla x Kong",
            genre: "Action • Sci-Fi",
            rating: "6.8",
            votes: "90K",
            img: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&q=80",
            is3D: true,
          },
          {
            id: "m3",
            title: "Spiderman: Lotus",
            genre: "Action • Fan-Film",
            rating: "8.1",
            votes: "20K",
            img: "https://images.unsplash.com/photo-1604200213928-ba3cb4fc8436?w=400&q=80",
            is3D: false,
          },
          {
            id: "m4",
            title: "The Fall Guy",
            genre: "Action • Comedy",
            rating: "7.9",
            votes: "12K",
            img: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&q=80",
            is3D: false,
          },
        ],
      },
      buses: {
        offers: [
          {
            id: "o1",
            title: "Get 20% OFF on First Bus",
            code: "FIRSTBUS",
            color1: "#3b82f6",
            color2: "#1d4ed8",
          },
          {
            id: "o2",
            title: "Flat ₹200 Cashback via UPI",
            code: "UPI200",
            color1: "#8b5cf6",
            color2: "#6d28d9",
          },
        ],
        routes: [
          {
            id: "b1",
            from: "Delhi",
            to: "Manali",
            departure: "22:00",
            arrival: "10:30",
            duration: "12h 30m",
            operator: "IntrCity SmartBus",
            rating: "4.6",
            price: "₹1,299",
            type: "A/C Sleeper (2+1)",
            amenities: ["Wifi", "Water", "Blanket"],
          },
          {
            id: "b2",
            from: "Mumbai",
            to: "Goa",
            departure: "19:30",
            arrival: "08:00",
            duration: "12h 30m",
            operator: "Zingbus Premium",
            rating: "4.5",
            price: "₹1,450",
            type: "Volvo Multi-Axle A/C",
            amenities: ["Wifi", "Snacks", "Charging"],
          },
          {
            id: "b3",
            from: "Bangalore",
            to: "Hyderabad",
            departure: "23:15",
            arrival: "07:15",
            duration: "8h 00m",
            operator: "SRS Travels",
            rating: "4.2",
            price: "₹950",
            type: "Non A/C Sleeper",
            amenities: ["Blanket", "Reading Light"],
          },
        ],
      },
      events: [
        {
          id: "e1",
          title: "Ed Sheeran: +-=÷x Tour",
          date: "Sat, 24 Nov",
          time: "19:00",
          venue: "Mahalaxmi Race Course, Mumbai",
          price: "₹3,500",
          img: "https://images.unsplash.com/photo-1540039155732-6761b54fce8b?w=600&q=80",
          category: "Music",
        },
        {
          id: "e2",
          title: "Zakir Khan Live",
          date: "Sun, 10 Dec",
          time: "18:30",
          venue: "Siri Fort Auditorium, Delhi",
          price: "₹999",
          img: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&q=80",
          category: "Comedy",
        },
        {
          id: "e3",
          title: "Sunsplash Music Festival",
          date: "15-17 Dec",
          time: "Multiple",
          venue: "Vagator Beach, Goa",
          price: "₹4,999",
          img: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&q=80",
          category: "Festival",
        },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Server error fetching tickets",
        error: error.message,
      });
  }
};
